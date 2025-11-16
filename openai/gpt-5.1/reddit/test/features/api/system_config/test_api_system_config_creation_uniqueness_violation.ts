import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemConfig";

/**
 * Validate that system configuration creation enforces uniqueness on (category,
 * config_key) for adminUser-managed configs.
 *
 * Business workflow:
 *
 * 1. Register an adminUser via POST /auth/adminUser/join to obtain an authorized
 *    admin context and token.
 * 2. Using that admin context, create an initial system configuration via POST
 *    /communityPlatform/adminUser/systemConfigs with a specific (category,
 *    config_key) pair.
 * 3. Attempt to create another configuration with the exact same (category,
 *    config_key) but different value/description and assert that the API
 *    rejects this duplicate creation.
 * 4. Verify that the original configuration object remains consistent with the
 *    initial input after the failed duplicate attempt.
 */
export async function test_api_system_config_creation_uniqueness_violation(
  connection: api.IConnection,
) {
  // 1. Join as a new adminUser to get an authorized context and token
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const admin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(admin);
  typia.assert<IAuthorizationToken>(admin.token);

  // 2. Create an initial system configuration with a chosen (category, config_key)
  const category = "rate_limit";
  const configKey = "max_requests_per_minute" as string & tags.MinLength<1>;

  const createBody1 = {
    category,
    config_key: configKey,
    value: '{"limit":100}',
    description: RandomGenerator.paragraph({ sentences: 3 }),
    is_active: true,
  } satisfies ICommunityPlatformSystemConfig.ICreate;

  const config1: ICommunityPlatformSystemConfig =
    await api.functional.communityPlatform.adminUser.systemConfigs.create(
      connection,
      { body: createBody1 },
    );
  typia.assert<ICommunityPlatformSystemConfig>(config1);

  TestValidator.equals(
    "first config category should match input category",
    config1.category,
    category,
  );
  TestValidator.equals(
    "first config key should match input key",
    config1.config_key,
    configKey,
  );
  TestValidator.equals(
    "first config value should match input value",
    config1.value,
    createBody1.value,
  );
  TestValidator.equals(
    "first config is_active should be true",
    config1.is_active,
    true,
  );

  // 3. Attempt to create a duplicate configuration with same (category, config_key)
  const createBody2 = {
    category,
    config_key: configKey,
    value: '{"limit":200}',
    description: RandomGenerator.paragraph({ sentences: 2 }),
    is_active: false,
  } satisfies ICommunityPlatformSystemConfig.ICreate;

  await TestValidator.error(
    "duplicate system config creation must fail",
    async () => {
      await api.functional.communityPlatform.adminUser.systemConfigs.create(
        connection,
        { body: createBody2 },
      );
    },
  );

  // 4. Verify that the original configuration object remains consistent
  TestValidator.equals(
    "original config key still matches",
    config1.config_key,
    configKey,
  );
  TestValidator.equals(
    "original config category still matches",
    config1.category,
    category,
  );
  TestValidator.equals(
    "original config value remains initial value",
    config1.value,
    createBody1.value,
  );
  TestValidator.equals(
    "original config is_active remains true",
    config1.is_active,
    true,
  );
}
