import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMetadataRegistryFieldDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMetadataRegistryFieldDefinition";
import type { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";
import { generate_random_ecommerce_super_administrator_metadata_registries_field_definitions_create } from "../../../generate/generate_random_ecommerce_super_administrator_metadata_registries_field_definitions_create";
import { prepare_random_ecommerce_metadata_registry_field_definition } from "../../../prepare/prepare_random_ecommerce_metadata_registry_field_definition";

/**
 * Test field definition creation when attempting to create under a non-existent or inactive metadata registry.
 */
export async function test_api_metadata_registry_field_definition_registry_not_found(
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
  // Test 1: Non-existent registry ID
  const nonExistentRegistryId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "non-existent registry should throw error",
    async () => {
      await api.functional.ecommerce.superAdministrator.metadata_registries.field_definitions.create(
        superAdminConnection,
        {
          registryId: nonExistentRegistryId,
          body: {
            field_name: RandomGenerator.alphabets(10),
            field_type: "string",
            description: RandomGenerator.paragraph({ sentences: 2 }),
            is_required: false,
            default_value: "default",
            validation_rules: JSON.stringify({ minLength: 1, maxLength: 100 }),
          } satisfies IEcommerceMetadataRegistryFieldDefinition.ICreate,
        },
      );
    },
  );
  // Test 2: Malformed UUID format
  const malformedUuid = "invalid-uuid-format";
  await TestValidator.error("malformed UUID should throw error", async () => {
    await api.functional.ecommerce.superAdministrator.metadata_registries.field_definitions.create(
      superAdminConnection,
      {
        registryId: malformedUuid as string & tags.Format<"uuid">,
        body: {
          field_name: RandomGenerator.alphabets(8),
          field_type: "number",
          description: RandomGenerator.paragraph({ sentences: 1 }),
          is_required: true,
          default_value: null,
          validation_rules: JSON.stringify({ minimum: 0, maximum: 100 }),
        } satisfies IEcommerceMetadataRegistryFieldDefinition.ICreate,
      },
    );
  });
  // Test 3: Previously deleted registry ID (using another random UUID to simulate)
  const deletedRegistryId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "previously deleted registry should throw error",
    async () => {
      await api.functional.ecommerce.superAdministrator.metadata_registries.field_definitions.create(
        superAdminConnection,
        {
          registryId: deletedRegistryId,
          body: {
            field_name: RandomGenerator.alphabets(12),
            field_type: "boolean",
            description: RandomGenerator.paragraph({ sentences: 3 }),
            is_required: false,
            default_value: "true",
            validation_rules: JSON.stringify({
              allowedValues: ["true", "false"],
            }),
          } satisfies IEcommerceMetadataRegistryFieldDefinition.ICreate,
        },
      );
    },
  );
  // Test 4: Empty string as registry ID
  await TestValidator.error(
    "empty registry ID should throw error",
    async () => {
      await api.functional.ecommerce.superAdministrator.metadata_registries.field_definitions.create(
        superAdminConnection,
        {
          registryId: "" as string & tags.Format<"uuid">,
          body: {
            field_name: RandomGenerator.alphabets(6),
            field_type: "array",
            description: null,
            is_required: true,
            default_value: "[]",
            validation_rules: JSON.stringify({ minItems: 0, maxItems: 10 }),
          } satisfies IEcommerceMetadataRegistryFieldDefinition.ICreate,
        },
      );
    },
  );
}
