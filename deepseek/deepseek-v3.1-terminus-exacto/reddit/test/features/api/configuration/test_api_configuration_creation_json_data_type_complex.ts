import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformConfiguration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_community_platform_admin_configurations_create } from "../../../generate/generate_random_community_platform_admin_configurations_create";
import { prepare_random_community_platform_configuration } from "../../../prepare/prepare_random_community_platform_configuration";

export async function test_api_configuration_creation_json_data_type_complex(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as admin using utility function
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Test 1: Create configuration with nested JSON object using utility function
  const complexConfig1 =
    await generate_random_community_platform_admin_configurations_create(
      adminConnection,
      {
        body: {
          config_key: `feature.complex.${RandomGenerator.alphabets(8)}`,
          config_value: JSON.stringify({
            enabled: true,
            thresholds: {
              min: 0,
              max: 100,
              default: 50,
            },
            rules: [
              { name: "rule1", condition: "value > 10", action: "allow" },
              { name: "rule2", condition: "value < 90", action: "deny" },
            ],
            metadata: {
              created_by: "system",
              version: "1.0.0",
              tags: ["feature", "advanced"],
            },
          }),
          data_type: "json",
          scope: "feature",
          description: "Complex nested JSON configuration for feature testing",
          is_active: true,
        },
      },
    );
  typia.assert(complexConfig1);
  TestValidator.equals(
    "data_type should be json",
    complexConfig1.data_type,
    "json",
  );
  TestValidator.equals(
    "scope should be feature",
    complexConfig1.scope,
    "feature",
  );
  // Enhanced JSON validation
  const parsedJson1 = JSON.parse(complexConfig1.config_value);
  TestValidator.predicate(
    "config_value should have enabled boolean",
    typeof parsedJson1.enabled === "boolean",
  );
  TestValidator.predicate(
    "config_value should have thresholds object",
    typeof parsedJson1.thresholds === "object",
  );
  TestValidator.predicate(
    "config_value should have rules array",
    Array.isArray(parsedJson1.rules),
  );
  // Test 2: Create configuration with JSON array structure using utility function
  const complexConfig2 =
    await generate_random_community_platform_admin_configurations_create(
      adminConnection,
      {
        body: {
          config_key: `feature.array.${RandomGenerator.alphabets(8)}`,
          config_value: JSON.stringify([
            {
              id: typia.random<string & tags.Format<"uuid">>(),
              name: "Item 1",
              values: [1, 2, 3],
              active: true,
            },
            {
              id: typia.random<string & tags.Format<"uuid">>(),
              name: "Item 2",
              values: [4, 5, 6],
              active: false,
            },
          ]),
          data_type: "json",
          scope: "feature",
          description: "JSON array configuration test",
          is_active: true,
        },
      },
    );
  typia.assert(complexConfig2);
  TestValidator.equals(
    "second config data_type should be json",
    complexConfig2.data_type,
    "json",
  );
  const parsedJson2 = JSON.parse(complexConfig2.config_value);
  TestValidator.predicate(
    "config_value should be array",
    Array.isArray(parsedJson2),
  );
  TestValidator.equals("array should have 2 items", parsedJson2.length, 2);
  // Test 3: Create configuration with mixed data types in JSON using utility function
  const complexConfig3 =
    await generate_random_community_platform_admin_configurations_create(
      adminConnection,
      {
        body: {
          config_key: `feature.mixed.${RandomGenerator.alphabets(8)}`,
          config_value: JSON.stringify({
            string_field: "test value",
            number_field: 42,
            boolean_field: true,
            null_field: null,
            array_field: ["item1", "item2", "item3"],
            nested_object: {
              deep_field: "deep value",
              numbers: [1, 2, 3, 4, 5],
            },
          }),
          data_type: "json",
          scope: "feature",
          description: "Mixed data types JSON configuration",
          is_active: false,
        },
      },
    );
  typia.assert(complexConfig3);
  TestValidator.equals(
    "third config is_active should be false",
    complexConfig3.is_active,
    false,
  );
  const parsedJson3 = JSON.parse(complexConfig3.config_value);
  TestValidator.equals(
    "string_field should match",
    parsedJson3.string_field,
    "test value",
  );
  TestValidator.equals(
    "number_field should match",
    parsedJson3.number_field,
    42,
  );
  TestValidator.equals(
    "boolean_field should be true",
    parsedJson3.boolean_field,
    true,
  );
  TestValidator.equals(
    "null_field should be null",
    parsedJson3.null_field,
    null,
  );
  // Validate all configurations have unique IDs
  TestValidator.notEquals(
    "configurations should have different IDs",
    complexConfig1.id,
    complexConfig2.id,
  );
  TestValidator.notEquals(
    "configurations should have different IDs",
    complexConfig1.id,
    complexConfig3.id,
  );
  TestValidator.notEquals(
    "configurations should have different IDs",
    complexConfig2.id,
    complexConfig3.id,
  );
  // Validate timestamps are properly set
  TestValidator.predicate("created_at should be valid date", () => {
    const date = new Date(complexConfig1.created_at);
    return !isNaN(date.getTime());
  });
  TestValidator.predicate("updated_at should be valid date", () => {
    const date = new Date(complexConfig1.updated_at);
    return !isNaN(date.getTime());
  });
}
