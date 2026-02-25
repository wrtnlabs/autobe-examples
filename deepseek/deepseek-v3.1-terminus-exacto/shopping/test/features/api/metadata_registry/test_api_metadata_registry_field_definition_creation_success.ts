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

/**
 * Test successful field definition creation under an existing active metadata registry.
 * As a super administrator, authenticate, create active metadata registry, then create
 * field definition with required fields. Validate complete response properties and
 * verify field name uniqueness enforcement within the same registry.
 */
export async function test_api_metadata_registry_field_definition_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as super administrator using utility function
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceSuperAdministrator.IJoin,
    },
  );
  typia.assert(superAdmin);
  // Step 2: Create an active metadata registry
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
  TestValidator.predicate("registry is active", () => registry.is_active);
  // Step 3: Create first field definition
  const fieldDefinitionBody1 = {
    field_name: RandomGenerator.alphabets(8),
    field_type: "string",
    description: RandomGenerator.paragraph({ sentences: 1 }),
    is_required: true,
    default_value: "default_value",
    validation_rules: JSON.stringify({ minLength: 1, maxLength: 100 }),
  } satisfies IEcommerceMetadataRegistryFieldDefinition.ICreate;
  const fieldDefinition1 =
    await api.functional.ecommerce.superAdministrator.metadata_registries.field_definitions.create(
      superAdminConnection,
      {
        registryId: registry.id,
        body: fieldDefinitionBody1,
      },
    );
  typia.assert(fieldDefinition1);
  // Step 4: Validate field definition properties
  TestValidator.equals(
    "field name matches",
    fieldDefinition1.field_name,
    fieldDefinitionBody1.field_name,
  );
  TestValidator.equals(
    "field type matches",
    fieldDefinition1.field_type,
    fieldDefinitionBody1.field_type,
  );
  TestValidator.predicate("has valid ID", () =>
    /^[0-9a-f-]{36}$/i.test(fieldDefinition1.id),
  );
  TestValidator.predicate(
    "has created_at timestamp",
    () => fieldDefinition1.created_at !== undefined,
  );
  TestValidator.predicate(
    "has updated_at timestamp",
    () => fieldDefinition1.updated_at !== undefined,
  );
  TestValidator.equals(
    "parent registry ID matches",
    fieldDefinition1.ecommerce_metadata_registry_id,
    registry.id,
  );
  TestValidator.equals(
    "is required flag correct",
    fieldDefinition1.is_required,
    fieldDefinitionBody1.is_required,
  );
  TestValidator.equals(
    "validation rules parsed correctly",
    fieldDefinition1.validation_rules,
    fieldDefinitionBody1.validation_rules,
  );
  // Step 5: Test field name uniqueness constraint
  await TestValidator.error("duplicate field name should fail", async () => {
    await api.functional.ecommerce.superAdministrator.metadata_registries.field_definitions.create(
      superAdminConnection,
      {
        registryId: registry.id,
        body: {
          field_name: fieldDefinition1.field_name,
          field_type: "number",
          is_required: false,
        } satisfies IEcommerceMetadataRegistryFieldDefinition.ICreate,
      },
    );
  });
  // Step 6: Create another field with different name to verify registry accepts multiple fields
  const fieldDefinition2 =
    await api.functional.ecommerce.superAdministrator.metadata_registries.field_definitions.create(
      superAdminConnection,
      {
        registryId: registry.id,
        body: {
          field_name: RandomGenerator.alphabets(8),
          field_type: "number",
          description: "Second field definition",
          is_required: false,
          default_value: "42",
          validation_rules: JSON.stringify({ minimum: 0, maximum: 100 }),
        } satisfies IEcommerceMetadataRegistryFieldDefinition.ICreate,
      },
    );
  typia.assert(fieldDefinition2);
  TestValidator.notEquals(
    "second field has different ID",
    fieldDefinition1.id,
    fieldDefinition2.id,
  );
  TestValidator.notEquals(
    "second field has different name",
    fieldDefinition1.field_name,
    fieldDefinition2.field_name,
  );
  TestValidator.equals(
    "second field belongs to same registry",
    fieldDefinition2.ecommerce_metadata_registry_id,
    registry.id,
  );
}
