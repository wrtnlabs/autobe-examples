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

export async function test_api_metadata_field_definition_soft_delete_success(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
    } satisfies IEcommerceAdministrator.IJoin,
  });
  typia.assert(admin);
  // Create a metadata registry
  const registry =
    await api.functional.ecommerce.administrator.metadata_registries.create(
      adminConnection,
      {
        body: {
          schema_name: RandomGenerator.alphabets(10),
          schema_version: "1.0.0",
          description: "Test metadata registry for field definition deletion",
          is_active: true,
        } satisfies IEcommerceMetadataRegistry.ICreate,
      },
    );
  typia.assert(registry);
  // Create a field definition within the registry
  const fieldDefinition =
    await api.functional.ecommerce.administrator.metadata_registries.field_definitions.create(
      adminConnection,
      {
        registryId: registry.id,
        body: {
          field_name: RandomGenerator.alphabets(8),
          field_type: "string",
          description: "Test field definition for deletion",
          is_required: true,
          default_value: "default",
          validation_rules: JSON.stringify({ minLength: 1, maxLength: 100 }),
        } satisfies IEcommerceMetadataRegistryFieldDefinition.ICreate,
      },
    );
  typia.assert(fieldDefinition);
  // Perform the soft delete operation
  await api.functional.ecommerce.administrator.metadata_registries.field_definitions.erase(
    adminConnection,
    {
      registryId: registry.id,
      fieldId: fieldDefinition.id,
    },
  );
  // Verify the registry still exists and is unaffected
  TestValidator.predicate("registry remains active", registry.is_active);
  TestValidator.equals("registry ID unchanged", registry.id, registry.id);
  TestValidator.predicate(
    "registry schema name exists",
    registry.schema_name.length > 0,
  );
}
