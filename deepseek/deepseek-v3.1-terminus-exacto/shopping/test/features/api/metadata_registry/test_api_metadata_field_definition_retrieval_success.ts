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

export async function test_api_metadata_field_definition_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {});
  typia.assert(adminAuth);
  // 2. Create metadata registry
  const registry =
    await generate_random_ecommerce_administrator_metadata_registries_create(
      adminConnection,
      {},
    );
  typia.assert(registry);
  // 3. Create field definition within the registry
  const fieldDefinitionCreateBody = {
    field_name: RandomGenerator.alphabets(8),
    field_type: RandomGenerator.pick(["string", "number", "boolean"] as const),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    is_required: RandomGenerator.pick([true, false]),
    default_value: RandomGenerator.alphabets(5),
    validation_rules: JSON.stringify({
      minLength: 1,
      maxLength: 100,
    }),
  } satisfies IEcommerceMetadataRegistryFieldDefinition.ICreate;
  const fieldDefinition =
    await generate_random_ecommerce_administrator_metadata_registries_field_definitions_create(
      adminConnection,
      {
        body: fieldDefinitionCreateBody,
        params: { registryId: registry.id },
      },
    );
  typia.assert(fieldDefinition);
  // 4. Retrieve the field definition
  const retrieved =
    await api.functional.ecommerce.administrator.metadata_registries.field_definitions.at(
      adminConnection,
      {
        registryId: registry.id,
        fieldId: fieldDefinition.id,
      },
    );
  typia.assert(retrieved);
  // 5. Validate all metadata
  TestValidator.equals("field definition ID", retrieved.id, fieldDefinition.id);
  TestValidator.equals(
    "field name",
    retrieved.field_name,
    fieldDefinitionCreateBody.field_name,
  );
  TestValidator.equals(
    "field type",
    retrieved.field_type,
    fieldDefinitionCreateBody.field_type,
  );
  TestValidator.equals(
    "description",
    retrieved.description ?? null,
    fieldDefinitionCreateBody.description ?? null,
  );
  TestValidator.equals(
    "is required",
    retrieved.is_required,
    fieldDefinitionCreateBody.is_required,
  );
  TestValidator.equals(
    "default value",
    retrieved.default_value ?? null,
    fieldDefinitionCreateBody.default_value ?? null,
  );
  TestValidator.equals(
    "validation rules",
    retrieved.validation_rules ?? null,
    fieldDefinitionCreateBody.validation_rules ?? null,
  );
  TestValidator.equals(
    "parent registry ID",
    retrieved.ecommerce_metadata_registry_id,
    registry.id,
  );
  TestValidator.predicate(
    "has created_at timestamp",
    () => !!retrieved.created_at,
  );
  TestValidator.predicate(
    "has updated_at timestamp",
    () => !!retrieved.updated_at,
  );
  TestValidator.predicate("timestamps are ISO strings", () => {
    return (
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(retrieved.created_at) &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(retrieved.updated_at)
    );
  });
}
