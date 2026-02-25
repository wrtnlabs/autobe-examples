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
 * Test that the system enforces field_name uniqueness strictly within each parent metadata registry.
 * Validates composite unique constraint on registry_id + field_name combination.
 */
export async function test_api_metadata_registry_field_name_uniqueness(
  connection: api.IConnection,
): Promise<void> {
  // Create base administrator connection for authorization
  const baseAdminConnection: api.IConnection = { host: connection.host };
  // Register administrator account using utility function
  await authorize_administrator_join(baseAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
    } satisfies IEcommerceAdministrator.IJoin,
  });
  // Create first dedicated registry connection using Connection Isolation Pattern
  const registry1Connection: api.IConnection = { host: connection.host };
  // Create first metadata registry using utility function
  const registry1 =
    await generate_random_ecommerce_administrator_metadata_registries_create(
      registry1Connection,
      {
        body: {
          schema_name: RandomGenerator.alphabets(10),
          schema_version: "1.0.0",
          description: RandomGenerator.paragraph({ sentences: 1 }),
          is_active: true,
        },
      },
    );
  typia.assert(registry1);
  // Create second dedicated registry connection using Connection Isolation Pattern
  const registry2Connection: api.IConnection = { host: connection.host };
  // Create second metadata registry using utility function
  const registry2 =
    await generate_random_ecommerce_administrator_metadata_registries_create(
      registry2Connection,
      {
        body: {
          schema_name: RandomGenerator.alphabets(10),
          schema_version: "1.0.0",
          description: RandomGenerator.paragraph({ sentences: 1 }),
          is_active: true,
        },
      },
    );
  typia.assert(registry2);
  const fieldName = RandomGenerator.alphabets(8);
  // Create field definition in first registry - should succeed
  const field1 =
    await api.functional.ecommerce.administrator.metadata_registries.field_definitions.create(
      registry1Connection,
      {
        registryId: registry1.id,
        body: {
          field_name: fieldName,
          field_type: "string",
          description: RandomGenerator.paragraph({ sentences: 1 }),
          is_required: true,
          default_value: "default",
          validation_rules: null,
        } satisfies IEcommerceMetadataRegistryFieldDefinition.ICreate,
      },
    );
  typia.assert(field1);
  // Attempt to create another field with same name in first registry - should fail with HTTP error
  await TestValidator.httpError(
    "duplicate field name in same registry",
    [400, 409],
    async () => {
      await api.functional.ecommerce.administrator.metadata_registries.field_definitions.create(
        registry1Connection,
        {
          registryId: registry1.id,
          body: {
            field_name: fieldName,
            field_type: "string",
            description: RandomGenerator.paragraph({ sentences: 1 }),
            is_required: false,
            default_value: null,
            validation_rules: null,
          } satisfies IEcommerceMetadataRegistryFieldDefinition.ICreate,
        },
      );
    },
  );
  // Create field with same name in second registry - should succeed
  const field2 =
    await api.functional.ecommerce.administrator.metadata_registries.field_definitions.create(
      registry2Connection,
      {
        registryId: registry2.id,
        body: {
          field_name: fieldName,
          field_type: "string",
          description: RandomGenerator.paragraph({ sentences: 1 }),
          is_required: false,
          default_value: null,
          validation_rules: null,
        } satisfies IEcommerceMetadataRegistryFieldDefinition.ICreate,
      },
    );
  typia.assert(field2);
  // Validate that fields have correct registry associations
  TestValidator.equals(
    "field1 belongs to registry1",
    field1.ecommerce_metadata_registry_id,
    registry1.id,
  );
  TestValidator.equals(
    "field2 belongs to registry2",
    field2.ecommerce_metadata_registry_id,
    registry2.id,
  );
  TestValidator.equals("field names match", field1.field_name, fieldName);
  TestValidator.equals(
    "field names across registries match",
    field2.field_name,
    fieldName,
  );
}
