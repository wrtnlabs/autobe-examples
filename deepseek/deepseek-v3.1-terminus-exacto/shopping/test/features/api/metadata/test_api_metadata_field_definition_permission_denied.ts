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
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_administrator_metadata_registries_create } from "../../../generate/generate_random_ecommerce_administrator_metadata_registries_create";
import { generate_random_ecommerce_administrator_metadata_registries_field_definitions_create } from "../../../generate/generate_random_ecommerce_administrator_metadata_registries_field_definitions_create";
import { prepare_random_ecommerce_metadata_registry } from "../../../prepare/prepare_random_ecommerce_metadata_registry";
import { prepare_random_ecommerce_metadata_registry_field_definition } from "../../../prepare/prepare_random_ecommerce_metadata_registry_field_definition";

export async function test_api_metadata_field_definition_permission_denied(
  connection: api.IConnection,
): Promise<void> {
  // Setup administrator account and create metadata registry
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceAdministrator.IJoin,
  });
  const registry =
    await generate_random_ecommerce_administrator_metadata_registries_create(
      adminConnection,
      {
        body: {
          schema_name: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 1,
            wordMax: 3,
          }),
          schema_version: "1.0.0",
          description: RandomGenerator.paragraph({ sentences: 1 }),
          is_active: true,
        } satisfies IEcommerceMetadataRegistry.ICreate,
      },
    );
  typia.assert(registry);
  // Add field definition to the registry
  const fieldDefinition =
    await generate_random_ecommerce_administrator_metadata_registries_field_definitions_create(
      adminConnection,
      {
        params: { registryId: registry.id },
        body: {
          field_name: RandomGenerator.alphabets(10),
          field_type: "string",
          description: RandomGenerator.paragraph({ sentences: 1 }),
          is_required: true,
          default_value: null,
          validation_rules: null,
        } satisfies IEcommerceMetadataRegistryFieldDefinition.ICreate,
      },
    );
  typia.assert(fieldDefinition);
  // Setup customer account for unauthorized access attempt
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  // Attempt deletion using customer connection - should fail
  await TestValidator.error("unauthorized deletion attempt", async () => {
    await api.functional.ecommerce.administrator.metadata_registries.field_definitions.erase(
      customerConnection,
      {
        registryId: registry.id,
        fieldId: fieldDefinition.id,
      },
    );
  });
}
