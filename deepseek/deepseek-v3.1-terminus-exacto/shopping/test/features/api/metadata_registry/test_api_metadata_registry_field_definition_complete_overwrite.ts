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
 * Test comprehensive field definition update including all mutable properties.
 * Validate that description, is_required, default_value, validation_rules,
 * and field_type can be updated simultaneously.
 */
export async function test_api_metadata_registry_field_definition_complete_overwrite(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup super administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_super_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSuperAdministrator.IJoin,
  });
  // 2. Create parent metadata registry using SDK (no utility available)
  const registry =
    await api.functional.ecommerce.superAdministrator.metadata_registries.create(
      adminConnection,
      {
        body: {
          schema_name: RandomGenerator.paragraph({ sentences: 1 }),
          schema_version: "1.0.0",
          description: RandomGenerator.paragraph({ sentences: 2 }),
          is_active: true,
        } satisfies IEcommerceMetadataRegistry.ICreate,
      },
    );
  typia.assert(registry);
  // 3. Create initial field definition using SDK (no utility available)
  const initialFieldDefinition =
    await api.functional.ecommerce.superAdministrator.metadata_registries.field_definitions.create(
      adminConnection,
      {
        registryId: registry.id,
        body: {
          field_name: RandomGenerator.alphabets(8),
          field_type: "string",
          description: RandomGenerator.paragraph({ sentences: 1 }),
          is_required: false,
          default_value: "default_value",
          validation_rules: '{"maxLength": 100}',
        } satisfies IEcommerceMetadataRegistryFieldDefinition.ICreate,
      },
    );
  typia.assert(initialFieldDefinition);
  // 4. Update field definition with completely different values
  const updateBody: IEcommerceMetadataRegistryFieldDefinition.IUpdate = {
    field_name: RandomGenerator.alphabets(8),
    field_type: "number",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    is_required: true,
    default_value: "42",
    validation_rules: '{"minimum": 1, "maximum": 100}',
  };
  const updatedFieldDefinition =
    await api.functional.ecommerce.superAdministrator.metadata_registries.field_definitions.update(
      adminConnection,
      {
        registryId: registry.id,
        fieldId: initialFieldDefinition.id,
        body: updateBody,
      },
    );
  typia.assert(updatedFieldDefinition);
  // 5. Validate all mutable properties were updated correctly
  TestValidator.equals(
    "field name updated",
    updatedFieldDefinition.field_name,
    updateBody.field_name,
  );
  TestValidator.equals(
    "field type updated",
    updatedFieldDefinition.field_type,
    updateBody.field_type,
  );
  TestValidator.equals(
    "description updated",
    updatedFieldDefinition.description,
    updateBody.description,
  );
  TestValidator.equals(
    "is_required updated",
    updatedFieldDefinition.is_required,
    updateBody.is_required,
  );
  TestValidator.equals(
    "default_value updated",
    updatedFieldDefinition.default_value,
    updateBody.default_value,
  );
  TestValidator.equals(
    "validation_rules updated",
    updatedFieldDefinition.validation_rules,
    updateBody.validation_rules,
  );
  // 6. Validate immutable properties are preserved
  TestValidator.equals(
    "id preserved",
    updatedFieldDefinition.id,
    initialFieldDefinition.id,
  );
  TestValidator.equals(
    "parent registry ID preserved",
    updatedFieldDefinition.ecommerce_metadata_registry_id,
    registry.id,
  );
  TestValidator.predicate(
    "created_at preserved",
    updatedFieldDefinition.created_at === initialFieldDefinition.created_at,
  );
  TestValidator.predicate(
    "updated_at changed",
    updatedFieldDefinition.updated_at !== initialFieldDefinition.updated_at,
  );
}
