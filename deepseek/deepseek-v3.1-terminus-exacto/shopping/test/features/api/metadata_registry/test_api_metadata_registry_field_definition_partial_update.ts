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

export async function test_api_metadata_registry_field_definition_partial_update(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Super Administrator authentication
  const superAdminConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_super_administrator_join(
    superAdminConnection,
    {},
  );
  typia.assert(auth);
  // Step 2: Create parent metadata registry
  const registry =
    await generate_random_ecommerce_super_administrator_metadata_registries_create(
      superAdminConnection,
      {},
    );
  typia.assert(registry);
  // Step 3: Create initial field definition
  const originalField =
    await generate_random_ecommerce_super_administrator_metadata_registries_field_definitions_create(
      superAdminConnection,
      {
        params: { registryId: registry.id },
      },
    );
  typia.assert(originalField);
  // Step 4: Partially update specific properties
  const updatePayload: IEcommerceMetadataRegistryFieldDefinition.IUpdate = {
    field_name: RandomGenerator.alphabets(10),
    field_type: "string",
    description: RandomGenerator.paragraph({ sentences: 2 }),
  };
  const updatedField =
    await api.functional.ecommerce.superAdministrator.metadata_registries.field_definitions.update(
      superAdminConnection,
      {
        registryId: registry.id,
        fieldId: originalField.id,
        body: updatePayload,
      },
    );
  typia.assert(updatedField);
  // Step 5: Verify only provided fields changed
  TestValidator.equals(
    "field_id remains unchanged",
    updatedField.id,
    originalField.id,
  );
  TestValidator.equals(
    "registry_id remains unchanged",
    updatedField.ecommerce_metadata_registry_id,
    originalField.ecommerce_metadata_registry_id,
  );
  TestValidator.equals(
    "field_name updated",
    updatedField.field_name,
    updatePayload.field_name,
  );
  TestValidator.equals(
    "field_type updated",
    updatedField.field_type,
    updatePayload.field_type,
  );
  TestValidator.equals(
    "description updated",
    updatedField.description,
    updatePayload.description,
  );
  TestValidator.equals(
    "is_required remains unchanged",
    updatedField.is_required,
    originalField.is_required,
  );
  TestValidator.equals(
    "default_value remains unchanged",
    updatedField.default_value,
    originalField.default_value,
  );
  TestValidator.equals(
    "validation_rules remains unchanged",
    updatedField.validation_rules,
    originalField.validation_rules,
  );
  // Step 6: Validate timestamps
  TestValidator.equals(
    "created_at remains unchanged",
    updatedField.created_at,
    originalField.created_at,
  );
  TestValidator.notEquals(
    "updated_at changed",
    updatedField.updated_at,
    originalField.updated_at,
  );
  // Step 7: Test field name uniqueness constraint
  // Create second field definition
  const secondField =
    await generate_random_ecommerce_super_administrator_metadata_registries_field_definitions_create(
      superAdminConnection,
      {
        params: { registryId: registry.id },
      },
    );
  typia.assert(secondField);
  // Attempt to update second field with duplicate name (should fail)
  await TestValidator.error(
    "field name must be unique within registry",
    async () => {
      await api.functional.ecommerce.superAdministrator.metadata_registries.field_definitions.update(
        superAdminConnection,
        {
          registryId: registry.id,
          fieldId: secondField.id,
          body: { field_name: updatedField.field_name },
        },
      );
    },
  );
  // Step 8: Validate response completeness
  TestValidator.predicate(
    "response contains all required properties",
    () =>
      updatedField.id !== undefined &&
      updatedField.field_name !== undefined &&
      updatedField.field_type !== undefined &&
      updatedField.is_required !== undefined &&
      updatedField.created_at !== undefined &&
      updatedField.updated_at !== undefined &&
      updatedField.ecommerce_metadata_registry_id !== undefined,
  );
}
