import Association from './association';
import _assign from 'lodash/object/assign';
import { capitalize } from 'ember-cli-mirage/utils/inflector';

class BelongsTo extends Association {

  /*
    The belongsTo association adds a fk to the owner of the association
  */
  getForeignKeyArray() {
    let key = this.options.klass || this.target;
    return [this.owner, `${key}Id`];
  }

  getForeignKey() {
    let key = this.options.klass || this.target;
    return `${key}Id`;
  }

  addMethodsToModelClass(ModelClass, key, schema) {
    let modelPrototype = ModelClass.prototype;
    var association = this;
    var foreignKey = this.getForeignKey();

    var associationHash = {};
    associationHash[key] = this;
    modelPrototype.belongsToAssociations = _assign(modelPrototype.belongsToAssociations, associationHash);
    modelPrototype.associationKeys.push(key);
    modelPrototype.associationIdKeys.push(foreignKey);

    Object.defineProperty(modelPrototype, this.getForeignKey(), {

      /*
        object.parentId
          - returns the associated parent's id
      */
      get: function() {
        return this.attrs[foreignKey];
      },

      /*
        object.parentId = (parentId)
          - sets the associated parent (via id)
      */
      set: function(id) {
        if (association.options.polymorphic) {
          association.target = this.resourceType;
        }

        if (id && !schema[association.target].find(id)) {
          throw 'Couldn\'t find ' + association.target + ' with id = ' + id;
        }

        this.attrs[foreignKey] = id;
        return this;
      },
    });

    Object.defineProperty(modelPrototype, key, {
      /*
        object.parent
          - returns the associated parent
      */
      get: function() {
        var foreignKeyId = this[foreignKey];
        if (foreignKeyId) {
          association._tempParent = null;
          return schema[association.target].find(foreignKeyId);

        } else if (association._tempParent) {
          return association._tempParent;
        } else {
          return null;
        }
      },

      /*
        object.parent = (parentModel)
          - sets the associated parent (via model)
      */
      set: function(newModel) {
        if (newModel && newModel.isNew()) {
          this[foreignKey] = null;
          association._tempParent = newModel;
        } else if (newModel) {
          association._tempParent = null;
          this[foreignKey] = newModel.id;
        } else {
          association._tempParent = null;
          this[foreignKey] = null;
        }
      },
    });

    /*
      object.newParent
        - creates a new unsaved associated parent
    */
    modelPrototype['new' + capitalize(key)] = function(attrs) {
      var parent = schema[key].new(attrs);

      this[key] = parent;

      return parent;
    };

    /*
      object.createParent
        - creates an associated parent, persists directly to db,
          and updates the owner's foreign key
    */
    modelPrototype['create' + capitalize(key)] = function(attrs) {
      var parent = schema[key].create(attrs);

      this[foreignKey] = parent.id;

      return parent;
    };
  }

}

export default BelongsTo;
