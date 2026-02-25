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

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";
import { generate_random_ecommerce_super_administrator_metadata_registries_create } from "../../../generate/generate_random_ecommerce_super_administrator_metadata_registries_create";
import { generate_random_ecommerce_super_administrator_metadata_registries_field_definitions_create } from "../../../generate/generate_random_ecommerce_super_administrator_metadata_registries_field_definitions_create";
import { prepare_random_ecommerce_metadata_registry } from "../../../prepare/prepare_random_ecommerce_metadata_registry";
import { prepare_random_ecommerce_metadata_registry_field_definition } from "../../../prepare/prepare_random_ecommerce_metadata_registry_field_definition";

export async function test_api_metadata_registry_field_definition_rename_uniqueness(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Authenticate as super administrator using utility function
  await authorize_super_administrator_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSuperAdministrator.IJoin,
  });
  // Create parent metadata registry using generation function
  const registry =
    await generate_random_ecommerce_super_administrator_metadata_registries_create(
      superAdminConnection,
      {
        body: {
          schema_name: RandomGenerator.alphabets(10),
          schema_version: "1.0.0",
          description:
            "Test registry for field definition uniqueness validation",
          is_active: true,
        } satisfies IEcommerceMetadataRegistry.ICreate,
      },
    );
  typia.assert(registry);
  // Create first field definition with name 'field_A'
  const fieldA =
    await generate_random_ecommerce_super_administrator_metadata_registries_field_definitions_create(
      superAdminConnection,
      {
        params: { registryId: registry.id },
        body: {
          field_name: "field_A",
          field_type: "string",
          description: "First test field definition",
          is_required: true,
          default_value: null,
          validation_rules: null,
        } satisfies IEcommerceMetadataRegistryFieldDefinition.ICreate,
      },
    );
  typia.assert(fieldA);
  // Create second field definition with name 'field_B'
  const fieldB =
    await generate_random_ecommerce_super_administrator_metadata_registries_field_definitions_create(
      superAdminConnection,
      {
        params: { registryId: registry.id },
        body: {
          field_name: "field_B",
          field_type: "number",
          description: "Second test field definition",
          is_required: false,
          default_value: "0",
          validation_rules: JSON.stringify({ min: 0, max: 100 }),
        } satisfies IEcommerceMetadataRegistryFieldDefinition.ICreate,
      },
    );
  typia.assert(fieldB);
  // Attempt to update first field definition with duplicate name 'field_B' (should fail)
  await TestValidator.error(
    "field name uniqueness constraint violation",
    async () => {
      await api.functional.ecommerce.superAdministrator.metadata_registries.field_definitions.update(
        superAdminConnection,
        {
          registryId: registry.id,
          fieldId: fieldA.id,
          body: {
            field_name: "field_B",
            field_type: "boolean",
            description: "Updated field definition with duplicate name",
          } satisfies IEcommerceMetadataRegistryFieldDefinition.IUpdate,
        },
      );
    },
  );
  // Update first field definition with a new unique name 'field_C' (should succeed)
  const updatedField =
    await api.functional.ecommerce.superAdministrator.metadata_registries.field_definitions.update(
      superAdminConnection,
      {
        registryId: registry.id,
        fieldId: fieldA.id,
        body: {
          field_name: "field_C",
          field_type: "boolean",
          description: "Updated field definition with unique name",
          is_required: false,
          default_value: "false",
          validation_rules: JSON.stringify({ type: "boolean" }),
        } satisfies IEcommerceMetadataRegistryFieldDefinition.IUpdate,
      },
    );
  typia.assert(updatedField);
  // Validate successful update
  TestValidator.equals(
    "field name updated successfully",
    updatedField.field_name,
    "field_C",
  );
  TestValidator.equals(
    "field type updated successfully",
    updatedField.field_type,
    "boolean",
  );
  TestValidator.equals(
    "registry ID remains unchanged",
    updatedField.ecommerce_metadata_registry_id,
    registry.id,
  );
  TestValidator.predicate(
    "updated_at timestamp should be newer",
    new Date(updatedField.updated_at) > new Date(fieldA.updated_at),
  );
}
