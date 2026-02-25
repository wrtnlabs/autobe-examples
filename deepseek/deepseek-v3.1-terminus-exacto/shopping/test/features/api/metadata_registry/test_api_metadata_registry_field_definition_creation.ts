import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAuditLog";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceDbMigration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceDbMigration";
import type { IEcommerceMetadataRegistry } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMetadataRegistry";
import type { IEcommerceMetadataRegistryFieldDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMetadataRegistryFieldDefinition";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import type { IEcommerceSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSystemSetting";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_ecommerce_administrator_metadata_registries_create } from "../../../generate/generate_random_ecommerce_administrator_metadata_registries_create";
import { generate_random_ecommerce_administrator_metadata_registries_field_definitions_create } from "../../../generate/generate_random_ecommerce_administrator_metadata_registries_field_definitions_create";
import { prepare_random_ecommerce_metadata_registry } from "../../../prepare/prepare_random_ecommerce_metadata_registry";
import { prepare_random_ecommerce_metadata_registry_field_definition } from "../../../prepare/prepare_random_ecommerce_metadata_registry_field_definition";

/**
 * Test metadata registry field definition creation workflow.
 * 1. Administrator registers and authenticates
 * 2. Create a parent metadata registry
 * 3. Create field definition within the registry
 * 4. Validate field definition properties and uniqueness constraints
 */
export async function test_api_metadata_registry_field_definition_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
    } satisfies IEcommerceAdministrator.IJoin,
  });
  // 2. Create parent metadata registry
  const registry =
    await generate_random_ecommerce_administrator_metadata_registries_create(
      adminConnection,
      {
        body: {
          schema_name: RandomGenerator.alphaNumeric(8),
          schema_version: "1.0.0",
          description: RandomGenerator.paragraph({ sentences: 2 }),
          is_active: true,
        } satisfies IEcommerceMetadataRegistry.ICreate,
      },
    );
  typia.assert(registry);
  // 3. Create field definition with stored input values
  const fieldInput = {
    field_name: RandomGenerator.alphabets(8),
    field_type: "string",
    description: RandomGenerator.paragraph({ sentences: 1 }),
    is_required: true,
    default_value: "default_value",
    validation_rules: JSON.stringify({ maxLength: 100 }),
  } satisfies IEcommerceMetadataRegistryFieldDefinition.ICreate;
  const fieldDefinition =
    await generate_random_ecommerce_administrator_metadata_registries_field_definitions_create(
      adminConnection,
      {
        params: { registryId: registry.id },
        body: fieldInput,
      },
    );
  typia.assert(fieldDefinition);
  // 4. Validate field definition business properties (not types)
  TestValidator.equals(
    "field name matches input",
    fieldDefinition.field_name,
    fieldInput.field_name,
  );
  TestValidator.equals(
    "field type matches input",
    fieldDefinition.field_type,
    fieldInput.field_type,
  );
  TestValidator.equals(
    "description matches input",
    fieldDefinition.description,
    fieldInput.description,
  );
  TestValidator.equals(
    "is required matches input",
    fieldDefinition.is_required,
    fieldInput.is_required,
  );
  TestValidator.equals(
    "default value matches input",
    fieldDefinition.default_value,
    fieldInput.default_value,
  );
  TestValidator.equals(
    "validation rules matches input",
    fieldDefinition.validation_rules,
    fieldInput.validation_rules,
  );
  TestValidator.equals(
    "registry id matches parent",
    fieldDefinition.ecommerce_metadata_registry_id,
    registry.id,
  );
  // 5. Test field name uniqueness constraint within same registry
  await TestValidator.error(
    "duplicate field name in same registry",
    async () => {
      await generate_random_ecommerce_administrator_metadata_registries_field_definitions_create(
        adminConnection,
        {
          params: { registryId: registry.id },
          body: {
            field_name: fieldInput.field_name,
            field_type: fieldInput.field_type,
            is_required: fieldInput.is_required,
          } satisfies IEcommerceMetadataRegistryFieldDefinition.ICreate,
        },
      );
    },
  );
  // 6. Test same field name allowed in different registry
  const secondRegistry =
    await generate_random_ecommerce_administrator_metadata_registries_create(
      adminConnection,
      {
        body: {
          schema_name: RandomGenerator.alphaNumeric(8),
          schema_version: "2.0.0",
          is_active: true,
        } satisfies IEcommerceMetadataRegistry.ICreate,
      },
    );
  typia.assert(secondRegistry);
  const duplicateFieldNameDefinition =
    await generate_random_ecommerce_administrator_metadata_registries_field_definitions_create(
      adminConnection,
      {
        params: { registryId: secondRegistry.id },
        body: {
          field_name: fieldInput.field_name,
          field_type: "boolean",
          is_required: true,
        } satisfies IEcommerceMetadataRegistryFieldDefinition.ICreate,
      },
    );
  typia.assert(duplicateFieldNameDefinition);
  TestValidator.equals(
    "same field name allowed in different registry",
    duplicateFieldNameDefinition.field_name,
    fieldInput.field_name,
  );
  TestValidator.notEquals(
    "different registry IDs",
    duplicateFieldNameDefinition.ecommerce_metadata_registry_id,
    registry.id,
  );
  // 7. Test creation with non-existent registry
  await TestValidator.error("non-existent registry", async () => {
    await generate_random_ecommerce_administrator_metadata_registries_field_definitions_create(
      adminConnection,
      {
        params: { registryId: typia.random<string & tags.Format<"uuid">>() },
        body: fieldInput,
      },
    );
  });
  // 8. Test creation with inactive registry
  const inactiveRegistry =
    await generate_random_ecommerce_administrator_metadata_registries_create(
      adminConnection,
      {
        body: {
          schema_name: RandomGenerator.alphaNumeric(8),
          schema_version: "3.0.0",
          is_active: false,
        } satisfies IEcommerceMetadataRegistry.ICreate,
      },
    );
  typia.assert(inactiveRegistry);
  await TestValidator.error("inactive registry", async () => {
    await generate_random_ecommerce_administrator_metadata_registries_field_definitions_create(
      adminConnection,
      {
        params: { registryId: inactiveRegistry.id },
        body: fieldInput,
      },
    );
  });
}
