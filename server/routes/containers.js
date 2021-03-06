const express = require("express");
const router = express.Router();
const Container = require("../models/container");
const Source = require("../models/source");
const User = require("../models/user");
const containerSchemas = require("./schemas/containerSchemas");
const Category = require("../models/category");

// container CRUD
router.post("/", async (req, res) => {
  try {
    await containerSchemas.postContainersInput.validateAsync(req.body);

    // const get whole owner obejct from current user
    const requester = await User.readById(req.user.id);

    // check if the sources from req exist and are owned by current user
    const sources = await Promise.all(
      req.body.sources.map((sourceId) => Source.readById(sourceId, requester))
    );

    //create new container and get its name and id
    const newContainer = await Container.create(req.body, requester);

    // create default categories to prevent bugs
    await Category.create(newContainer.id, {name: "Food"})
    await Category.create(newContainer.id, {name: "Transport"})
    await Category.create(newContainer.id, {name: "Bills"})

    // bind the sources to the container
    await Promise.all(
      req.body.sources.map((sourceId) =>
        Container.insertSourceContainer(sourceId, newContainer.id, requester.id)
      )
    );

    // attach owner and sources to newContainer
    newContainer.owner = requester;
    newContainer.sources = sources;


    // validate with Joi the newContainer
    await containerSchemas.postContainersOutput.validateAsync(newContainer);
    res.status(201).json(newContainer);
    // });
  } catch (err) {
    res.status(err.status || 400).json(err);
  }
});

router.get("/", async (req, res) => {
  try {
    // fetch all containers where user is owner OR has access
    const containers = await Container.readAll(req.user);

    // fetch owner of each container
    const owners = await Promise.all(
      containers.map((container) => User.readById(container.owner.id))
    );

    // append owner to respective container
    containers.forEach((container, index) => (container.owner = owners[index]));

    await containerSchemas.getContainersOutput.validateAsync(containers);
    res.json(containers);
  } catch (err) {
    res.status(err.status || 400).json(err);
  }
});

router.get("/:containerId", async (req, res) => {
  try {
    // check if user has access to this container
    await Container.checkUserContainer(req.user.id, req.params.containerId);

    // fetch container
    const container = await Container.readById(req.params.containerId);

    // fetch user to get their preffered currency
    const requester = await User.readById(req.user.id);

    // fetch all sources
    const sources = await Promise.all(
      container.sources.map((sourceId) => Source.readById(sourceId, requester))
    );

    // fetch container owner
    const owner = await User.readById(container.owner.id);

    // append sources and owner to container
    container.sources = sources;
    container.owner = owner;

    await containerSchemas.getContainerIdOutput.validateAsync(container);
    res.json(container);
  } catch (err) {
    res.status(err.status || 400).json(err);
  }
});

router.patch("/:containerId", async (req, res) => {
  try {
    await containerSchemas.patchContainerInput.validateAsync(req.body);

    // check if requester is owner of the container
    await Container.checkOwner(req.params.containerId, req.user.id);

    // fetch requester info
    const requester = await User.readById(req.user.id);

    // fetch container info
    const container = await Container.readById(req.params.containerId);

    // update container instance
    await container.update(req.body, requester);

    // fetch sources
    const sources = await Promise.all(
      container.sources.map((sourceId) => Source.readById(sourceId, requester))
    );

    // append source and owner
    container.sources = sources;
    container.owner = requester;

    await containerSchemas.patchContainerOutput.validateAsync(container);
    res.json(container);
  } catch (err) {
    res.status(err.status || 400).json(err);
  }
});

router.delete("/:containerId", async (req, res) => {
  try {
    // check if requester is owner of the container
    await Container.checkOwner(req.params.containerId, req.user.id);

    // delete container
    await Container.delete(req.params.containerId);

    res.json({ message: "Container deleted" });
  } catch (err) {
    res.status(err.status || 400).json(err);
  }
});

// collaborators CRD
router.post("/:containerId/collaborators", async (req, res) => {
  // add new collaborator to container
  try {
    // check if requester is the owner of the container
    await Container.checkOwner(req.params.containerId, req.user.id);

    // fetch container
    const container = await Container.readById(req.params.containerId);

    // check if new collaborator exists
    const newCollaborator = await User.readById(req.body.collaboratorId);

    // add new collaborator to container
    await container.addCollaborator(newCollaborator);

    // get all collaborator Ids in the container
    const collaboratorIds = await container.getCollaborators();

    // get all collaborators in the container
    const collaborators = await Promise.all(
      collaboratorIds.map((collaboratorId) => User.readById(collaboratorId))
    );

    res.json(collaborators);
  } catch (err) {
    res.status(err.status || 400).json(err);
  }
});

router.get("/:containerId/collaborators", async (req, res) => {
  // get all collaborators in the container
  try {
    // check if user has access to this container
    await Container.checkUserContainer(req.user.id, req.params.containerId);

    // fetch requester info
    const requester = await User.readById(req.user.id);

    // fetch container
    const container = await Container.readById(
      req.params.containerId,
      requester
    );

    // get all collaborator Ids in the container
    const collaboratorIds = await container.getCollaborators();

    // get all collaborators in the container
    const collaborators = await Promise.all(
      collaboratorIds.map((collaboratorId) => User.readById(collaboratorId))
    );

    res.json(collaborators);
  } catch (err) {
    res.status(err.status || 400).json(err);
  }
});

router.delete(
  "/:containerId/collaborators/:collaboratorId",
  async (req, res) => {
    // remove collaborator from container
    try {
      // check if requester is container owner
      await Container.checkOwner(req.params.containerId, req.user.id);

      // check if collaborator is in container
      try {
        await Container.checkUserContainer(
          req.params.collaboratorId,
          req.params.containerId
        );
      } catch (e) {
        throw {
          status: 404,
          message: "This collaborator does not exist in this container",
        };
      }

      // fetch container
      const container = await Container.readById(req.params.containerId);

      // delete collaborator from container and all their permissions
      await container.deleteCollaborator(req.params.collaboratorId);

      res.json({ message: "Collaborator removed" });
    } catch (err) {
      res.status(err.status || 400).json(err);
    }
  }
);

// sources CRD
router.post("/:containerId/sources", async (req, res) => {
  // bind new source to container
  try {
    // check if requester has access to this container
    const UserContainerId = await Container.checkUserContainer(
      req.user.id,
      req.params.containerId
    );

    // check if requester owns the source
    await Source.checkOwner(req.body.sourceId, req.user.id);

    // fetch requester info
    const requester = await User.readById(req.user.id);

    // check if source exists
    await Source.readById(req.body.sourceId, requester);

    // fetch container
    const container = await Container.readById(req.params.containerId);

    // add new source to container
    const SourceContainerId = await container.addSource(req.body.sourceId);

    // add permission to use for the owner
    await container.addPermission(UserContainerId, SourceContainerId);

    // get all sourceIds bound to a container
    const sourceIds = await container.getSources();

    // get all sources bound to a container
    const sources = await Promise.all(
      sourceIds.map((sourceId) => Source.readById(sourceId, requester))
    );

    res.json(sources);
  } catch (err) {
    console.log(err);
    res.status(err.status || 400).json(err);
  }
});

router.get("/:containerId/sources", async (req, res) => {
  // get all sources bound to a container
  try {
    // check if user has access to this container
    await Container.checkUserContainer(req.user.id, req.params.containerId);

    // fetch container
    const container = await Container.readById(req.params.containerId);

    // fetch requester info
    const requester = await User.readById(req.user.id);

    // get all sourceIds bound to a container
    const sourceIds = await container.getSources();

    // get UserContainer permissions for each sources
    const usersWithAccess = await Promise.all(
      sourceIds.map((sourceId) => container.getPermissions(sourceId))
    );

    // get all sources bound to a container
    const sources = await Promise.all(
      sourceIds.map((sourceId) => Source.readById(sourceId, requester))
    );

    sources.forEach((source, index) => {
      const currentSource = source;

      currentSource.usersWithAccess = usersWithAccess[index];
    });

    res.json(sources);
  } catch (err) {
    res.status(err.status || 400).json(err);
  }
});

router.delete("/:containerId/sources/:sourceId", async (req, res) => {
  // get all sources bound to a container
  try {
    // check if requester is in container
    await Container.checkUserContainer(req.user.id, req.params.containerId);

    // check if source is in container
    await Container.checkSourceContainer(
      req.params.sourceId,
      req.params.containerId
    );

    // fetch container
    const container = await Container.readById(req.params.containerId);

    // delete source from container and all permissions related to the source
    await container.deleteSource(req.params.sourceId);

    res.json({ message: "Source deleted" });
  } catch (err) {
    res.status(err.status || 400).json(err);
  }
});

// permissions CRD
router.post("/:containerId/sources/:sourceId/permissions", async (req, res) => {
  // bind new source to container
  try {
    // check if source is in container
    const SourceContainerId = await Container.checkSourceContainer(
      req.params.sourceId,
      req.params.containerId
    );

    // check if requester is in container
    await Container.checkUserContainer(
      req.user.id,
      req.params.containerId
    );

    // check if user to add permission for is in the contianer
    const UserContainerId = await Container.checkUserContainer(
      req.body.userId,
      req.params.containerId
    );

    // check if requester owns the source
    await Source.checkOwner(req.params.sourceId, req.user.id);

    // fetch container
    const container = await Container.readById(req.params.containerId);

    // check if this user already has permission on this source
    const exists = await container.getPermissions(req.params.sourceId)
    console.log(exists)
    if (exists.includes(req.body.userId)) throw { message: "This user already has access to this source"}

    // add the permission
    await container.addPermission(UserContainerId, SourceContainerId);

    res.json(container);
  } catch (err) {
    console.log(err)
    res.status(err.status || 400).json(err);
  }
});

router.get("/:containerId/permissions", async (req, res) => {
  // get all sources bound to a container
  try {
    // check if user has access to this container
    await Container.checkUserContainer(req.user.id, req.params.containerId);

    // fetch container
    const container = await Container.readById(req.params.containerId);

    // fetch requester info
    const requester = await User.readById(req.user.id);

    // get all sourceIds bound to a container
    const sourceIds = await container.getSources();

    // get UserContainer permissions for each sources
    const usersWithAccess = await Promise.all(
      sourceIds.map((sourceId) => container.getPermissions(sourceId))
    );

    // get all sources bound to a container
    const sources = await Promise.all(
      sourceIds.map((sourceId) => Source.readById(sourceId, requester))
    );

    sources.forEach((source, index) => {
      const currentSource = source;

      currentSource.usersWithAccess = usersWithAccess[index];
    });

    res.json(sources);
  } catch (err) {
    console.log(err);
    res.status(err.status || 400).json(err);
  }
});

router.delete(
  "/:containerId/sources/:sourceId/permissions/:userId",
  async (req, res) => {
    // get all sources bound to a container
    try {
      // check if requester owns the source
      await Source.checkOwner(req.params.sourceId, req.user.id);

      // check if requester is in container
      await Container.checkUserContainer(req.user.id, req.params.containerId);

      // check if user is in container
      await Container.checkUserContainer(
        req.params.userId,
        req.params.containerId
      );

      // check if source is in container
      await Container.checkSourceContainer(
        req.params.sourceId,
        req.params.containerId
      );

      // fetch container
      const container = await Container.readById(req.params.containerId);

      // delete source from container and all permissions related to the source
      await container.deletePermission(req.params.sourceId, req.params.userId);

      res.json({ message: "Permission removed." });
    } catch (err) {
      console.log(err);
      res.status(err.status || 400).json(err);
    }
  }
);

module.exports = router;
