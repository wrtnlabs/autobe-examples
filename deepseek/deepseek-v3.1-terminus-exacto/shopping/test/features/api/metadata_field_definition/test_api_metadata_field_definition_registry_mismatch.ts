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

export async function test_api_metadata_field_definition_registry_mismatch(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  // Administrator authentication
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceAdministrator.IJoin,
  });
  typia.assert(admin);
  // Create first metadata registry
  const registry1 =
    await generate_random_ecommerce_administrator_metadata_registries_create(
      adminConnection,
      {
        body: {
          schema_name: RandomGenerator.alphabets(10),
          schema_version: "1.0.0",
          description: RandomGenerator.paragraph({ sentences: 2 }),
          is_active: true,
        } satisfies IEcommerceMetadataRegistry.ICreate,
      },
    );
  typia.assert(registry1);
  // Create second metadata registry
  const registry2 =
    await generate_random_ecommerce_administrator_metadata_registries_create(
      adminConnection,
      {
        body: {
          schema_name: RandomGenerator.alphabets(10),
          schema_version: "2.0.0",
          description: RandomGenerator.paragraph({ sentences: 2 }),
          is_active: true,
        } satisfies IEcommerceMetadataRegistry.ICreate,
      },
    );
  typia.assert(registry2);
  // Add field definition to first registry
  const fieldDefinition1 =
    await generate_random_ecommerce_administrator_metadata_registries_field_definitions_create(
      adminConnection,
      {
        params: { registryId: registry1.id },
        body: {
          field_name: RandomGenerator.alphabets(8),
          field_type: "string",
          description: RandomGenerator.paragraph({ sentences: 1 }),
          is_required: true,
          default_value: null,
          validation_rules: null,
        } satisfies IEcommerceMetadataRegistryFieldDefinition.ICreate,
      },
    );
  typia.assert(fieldDefinition1);
  // Add field definition to second registry
  const fieldDefinition2 =
    await generate_random_ecommerce_administrator_metadata_registries_field_definitions_create(
      adminConnection,
      {
        params: { registryId: registry2.id },
        body: {
          field_name: RandomGenerator.alphabets(8),
          field_type: "number",
          description: RandomGenerator.paragraph({ sentences: 1 }),
          is_required: false,
          default_value: null,
          validation_rules: null,
        } satisfies IEcommerceMetadataRegistryFieldDefinition.ICreate,
      },
    );
  typia.assert(fieldDefinition2);
  // Attempt to retrieve field definition using wrong registry ID combination
  // Registry1's field but using registry2's ID should fail
  await TestValidator.error(
    "retrieve field definition with registry mismatch",
    async () => {
      await api.functional.ecommerce.administrator.metadata_registries.field_definitions.at(
        adminConnection,
        {
          registryId: registry2.id, // Wrong registry ID
          fieldId: fieldDefinition1.id, // Field from registry1
        },
      );
    },
  );
  // Verify that field definitions are properly scoped to their parent registries
  // Valid retrieval of field definition with correct registry ID should succeed
  const validFieldDefinition =
    await api.functional.ecommerce.administrator.metadata_registries.field_definitions.at(
      adminConnection,
      {
        registryId: registry1.id, // Correct registry ID
        fieldId: fieldDefinition1.id, // Field from registry1
      },
    );
  typia.assert(validFieldDefinition);
  TestValidator.equals(
    "field definition matches original",
    validFieldDefinition.id,
    fieldDefinition1.id,
  );
  TestValidator.equals(
    "field definition belongs to correct registry",
    validFieldDefinition.ecommerce_metadata_registry_id,
    registry1.id,
  );
  // Additional validation: test with field from registry2 and registry1's ID
  await TestValidator.error(
    "retrieve second field definition with registry mismatch",
    async () => {
      await api.functional.ecommerce.administrator.metadata_registries.field_definitions.at(
        adminConnection,
        {
          registryId: registry1.id, // Wrong registry ID
          fieldId: fieldDefinition2.id, // Field from registry2
        },
      );
    },
  );
  // Validate field definition ownership consistency
  TestValidator.equals(
    "field definition 1 belongs to registry 1",
    fieldDefinition1.ecommerce_metadata_registry_id,
    registry1.id,
  );
  TestValidator.equals(
    "field definition 2 belongs to registry 2",
    fieldDefinition2.ecommerce_metadata_registry_id,
    registry2.id,
  );
}
