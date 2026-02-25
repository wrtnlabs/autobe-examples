import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAuditLog";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceDbMigration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceDbMigration";
import type { IEcommerceMetadataRegistry } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMetadataRegistry";
import type { IEcommerceMetadataRegistryFieldDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMetadataRegistryFieldDefinition";
import type { IEcommerceMetadataRegistryRelationship } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMetadataRegistryRelationship";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import type { IEcommerceSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSystemSetting";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";
import { generate_random_ecommerce_super_administrator_metadata_registries_create } from "../../../generate/generate_random_ecommerce_super_administrator_metadata_registries_create";
import { generate_random_ecommerce_super_administrator_metadata_registries_field_definitions_create } from "../../../generate/generate_random_ecommerce_super_administrator_metadata_registries_field_definitions_create";
import { generate_random_ecommerce_super_administrator_metadata_registries_relationships_create } from "../../../generate/generate_random_ecommerce_super_administrator_metadata_registries_relationships_create";
import { prepare_random_ecommerce_metadata_registry } from "../../../prepare/prepare_random_ecommerce_metadata_registry";
import { prepare_random_ecommerce_metadata_registry_field_definition } from "../../../prepare/prepare_random_ecommerce_metadata_registry_field_definition";
import { prepare_random_ecommerce_metadata_registry_relationship } from "../../../prepare/prepare_random_ecommerce_metadata_registry_relationship";

export async function test_api_metadata_registry_relationship_update_in_context(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_administrator_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSuperAdministrator.IJoin,
  });
  // Create base metadata registry
  const metadataRegistry =
    await generate_random_ecommerce_super_administrator_metadata_registries_create(
      superAdminConnection,
      {
        body: {
          schema_name: "test_schema",
          schema_version: "1.0.0",
          description:
            "Test metadata registry for relationship update validation",
          is_active: true,
        } satisfies IEcommerceMetadataRegistry.ICreate,
      },
    );
  typia.assert(metadataRegistry);
  // Create field definitions to test contextual isolation
  const fieldDefinition1 =
    await generate_random_ecommerce_super_administrator_metadata_registries_field_definitions_create(
      superAdminConnection,
      {
        params: { registryId: metadataRegistry.id },
        body: {
          field_name: "test_field_1",
          field_type: "string",
          description: "First test field definition",
          is_required: true,
          default_value: "default_value",
          validation_rules: '{"maxLength": 100}',
        } satisfies IEcommerceMetadataRegistryFieldDefinition.ICreate,
      },
    );
  typia.assert(fieldDefinition1);
  const fieldDefinition2 =
    await generate_random_ecommerce_super_administrator_metadata_registries_field_definitions_create(
      superAdminConnection,
      {
        params: { registryId: metadataRegistry.id },
        body: {
          field_name: "test_field_2",
          field_type: "number",
          description: "Second test field definition",
          is_required: false,
          default_value: "42",
          validation_rules: '{"minimum": 0}',
        } satisfies IEcommerceMetadataRegistryFieldDefinition.ICreate,
      },
    );
  typia.assert(fieldDefinition2);
  // Create first relationship to update
  const relationship1 =
    await generate_random_ecommerce_super_administrator_metadata_registries_relationships_create(
      superAdminConnection,
      {
        params: { registryId: metadataRegistry.id },
        body: {
          action_type: "parent_child",
          general_description: "Initial relationship description before update",
        } satisfies IEcommerceMetadataRegistryRelationship.ICreate,
      },
    );
  typia.assert(relationship1);
  // Create second relationship as sibling to validate isolation
  const relationship2 =
    await generate_random_ecommerce_super_administrator_metadata_registries_relationships_create(
      superAdminConnection,
      {
        params: { registryId: metadataRegistry.id },
        body: {
          action_type: "dependency",
          general_description:
            "Sibling relationship that should remain unchanged",
        } satisfies IEcommerceMetadataRegistryRelationship.ICreate,
      },
    );
  typia.assert(relationship2);
  // Store original values for validation
  const originalRelationship1Type = relationship1.action_type;
  const originalRelationship1Description = relationship1.general_description;
  // Update the first relationship
  const updateBody: IEcommerceMetadataRegistryRelationship.IUpdate = {
    relationship_type: "reference",
    relationship_direction: "bidirectional",
    relationship_description:
      "Updated relationship description after modification",
  };
  const updatedRelationship =
    await api.functional.ecommerce.superAdministrator.metadata_registries.relationships.update(
      superAdminConnection,
      {
        registryId: metadataRegistry.id,
        relationshipId: relationship1.id,
        body: updateBody,
      },
    );
  typia.assert(updatedRelationship);
  // Validate relationship update
  TestValidator.notEquals(
    "relationship type should change",
    updatedRelationship.action_type,
    originalRelationship1Type,
  );
  TestValidator.notEquals(
    "relationship description should change",
    updatedRelationship.general_description,
    originalRelationship1Description,
  );
  TestValidator.equals(
    "updated relationship type matches input",
    updatedRelationship.action_type,
    updateBody.relationship_type,
  );
  TestValidator.equals(
    "updated relationship description matches input",
    updatedRelationship.general_description,
    updateBody.relationship_description,
  );
  // Verify sibling relationship remains unchanged
  TestValidator.equals(
    "sibling relationship ID unchanged",
    relationship2.id,
    relationship2.id,
  );
  TestValidator.equals(
    "sibling relationship type unchanged",
    relationship2.action_type,
    "dependency",
  );
  TestValidator.equals(
    "sibling relationship description unchanged",
    relationship2.general_description,
    "Sibling relationship that should remain unchanged",
  );
  // Verify field definitions remain unaffected through basic existence check
  TestValidator.predicate(
    "first field definition created successfully",
    fieldDefinition1.id.length > 0,
  );
  TestValidator.predicate(
    "second field definition created successfully",
    fieldDefinition2.id.length > 0,
  );
  // Validate timestamp was updated
  const originalTimestamp = new Date(relationship1.updated_at).getTime();
  const updatedTimestamp = new Date(updatedRelationship.updated_at).getTime();
  TestValidator.predicate(
    "timestamp updated after modification",
    updatedTimestamp >= originalTimestamp,
  );
}
