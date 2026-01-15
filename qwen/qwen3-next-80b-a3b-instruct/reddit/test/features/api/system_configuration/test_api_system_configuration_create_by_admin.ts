import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformConfiguration";
import type { ICommunityPlatformConfigurationValue } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformConfigurationValue";
import { prepare_random_community_platform_configuration } from "../../../prepare/prepare_random_community_platform_configuration";
import { generate_random_community_platform_admin_configurations_create } from "../../../generate/generate_random_community_platform_admin_configurations_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_system_configuration_create_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com",
      ip: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Step 2: Generate random configuration data with all required properties
  const keyPrefix = "feature_toggle.";
  const randomKeySuffix = RandomGenerator.alphaNumeric(8);
  const key = keyPrefix + randomKeySuffix;
  // Ensure length is between 1-255 characters
  while (key.length > 255) {
    const shortSuffix = RandomGenerator.alphaNumeric(3);
    const key = keyPrefix + shortSuffix;
  }
  // Value must be string representation of boolean
  const configData = {
    key: key, // Unique key with dot-notation
    value: "true", // String representation of boolean true as required by the schema
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 4,
      wordMax: 10,
    }), // Descriptive text
    scope: "global", // Must be 'global' as specified in requirements
  } satisfies ICommunityPlatformConfiguration.ICreate;
  // Step 3: Create the configuration using the authenticated admin connection
  const createdConfig =
    await api.functional.communityPlatform.admin.configurations.create(
      adminConnection, // Use adminConnection, NOT base connection
      {
        body: configData,
      },
    );
  // Step 4: Validate the created configuration response
  typia.assert(createdConfig);
  // Step 5: Validate key matches expected format
  TestValidator.equals(
    "key format is dot-notation",
    createdConfig.key,
    configData.key,
  );
  // Step 6: Validate value is string "true" as JSON representation
  TestValidator.equals(
    "value is string representation of true",
    createdConfig.value,
    "true",
  );
  // Step 7: Validate scope is 'global'
  TestValidator.equals("scope is global", createdConfig.scope, "global");
  // Step 8: Validate is_active is true (default in system)
  TestValidator.equals("is_active is true", createdConfig.is_active, true);
}
