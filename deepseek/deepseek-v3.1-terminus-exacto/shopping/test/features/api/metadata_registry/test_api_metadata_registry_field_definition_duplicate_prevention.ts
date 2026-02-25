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

export async function test_api_metadata_registry_field_definition_duplicate_prevention(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_administrator_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSuperAdministrator.IJoin,
  });
  // Create an active metadata registry
  const registry =
    await api.functional.ecommerce.superAdministrator.metadata_registries.create(
      superAdminConnection,
      {
        body: {
          schema_name: RandomGenerator.alphabets(10),
          schema_version: "1.0.0",
          description: RandomGenerator.paragraph({ sentences: 2 }),
          is_active: true,
        } satisfies IEcommerceMetadataRegistry.ICreate,
      },
    );
  typia.assert(registry);
  // Create second metadata registry for cross-registry duplicate test
  const secondRegistry =
    await api.functional.ecommerce.superAdministrator.metadata_registries.create(
      superAdminConnection,
      {
        body: {
          schema_name: RandomGenerator.alphabets(10),
          schema_version: "1.0.0",
          description: RandomGenerator.paragraph({ sentences: 2 }),
          is_active: true,
        } satisfies IEcommerceMetadataRegistry.ICreate,
      },
    );
  typia.assert(secondRegistry);
  const duplicateFieldName = RandomGenerator.alphabets(15);
  // Create first field definition successfully
  const firstField =
    await api.functional.ecommerce.superAdministrator.metadata_registries.field_definitions.create(
      superAdminConnection,
      {
        registryId: registry.id,
        body: {
          field_name: duplicateFieldName,
          field_type: "string",
          description: "First field with duplicate name",
          is_required: true,
          default_value: "default",
          validation_rules: JSON.stringify({ minLength: 1, maxLength: 255 }),
        } satisfies IEcommerceMetadataRegistryFieldDefinition.ICreate,
      },
    );
  typia.assert(firstField);
  TestValidator.equals(
    "first field name matches",
    firstField.field_name,
    duplicateFieldName,
  );
  // Attempt to create duplicate field definition in same registry - should fail
  await TestValidator.httpError(
    "duplicate field name in same registry should return 400 error",
    400,
    async () => {
      await api.functional.ecommerce.superAdministrator.metadata_registries.field_definitions.create(
        superAdminConnection,
        {
          registryId: registry.id,
          body: {
            field_name: duplicateFieldName, // Same field name
            field_type: "number", // Different type, but same name should fail
            description: "Duplicate field with same name",
            is_required: false,
            default_value: null,
            validation_rules: JSON.stringify({ minimum: 0, maximum: 100 }),
          } satisfies IEcommerceMetadataRegistryFieldDefinition.ICreate,
        },
      );
    },
  );
  // Test same field name in different registry - should succeed
  const crossRegistryField =
    await api.functional.ecommerce.superAdministrator.metadata_registries.field_definitions.create(
      superAdminConnection,
      {
        registryId: secondRegistry.id,
        body: {
          field_name: duplicateFieldName, // Same name as in first registry
          field_type: "array",
          description: "Same field name in different registry",
          is_required: false,
          default_value: null,
          validation_rules: JSON.stringify({ minItems: 1 }),
        } satisfies IEcommerceMetadataRegistryFieldDefinition.ICreate,
      },
    );
  typia.assert(crossRegistryField);
  TestValidator.equals(
    "cross-registry field name matches",
    crossRegistryField.field_name,
    duplicateFieldName,
  );
  TestValidator.equals(
    "cross-registry field has different parent",
    crossRegistryField.ecommerce_metadata_registry_id,
    secondRegistry.id,
  );
  // Test completely different field name in same registry - should succeed
  const differentField =
    await api.functional.ecommerce.superAdministrator.metadata_registries.field_definitions.create(
      superAdminConnection,
      {
        registryId: registry.id,
        body: {
          field_name: RandomGenerator.alphabets(12),
          field_type: "object",
          description: "Completely different field",
          is_required: false,
          default_value: null,
          validation_rules: null,
        } satisfies IEcommerceMetadataRegistryFieldDefinition.ICreate,
      },
    );
  typia.assert(differentField);
  TestValidator.notEquals(
    "different field name is allowed",
    differentField.field_name,
    duplicateFieldName,
  );
}
