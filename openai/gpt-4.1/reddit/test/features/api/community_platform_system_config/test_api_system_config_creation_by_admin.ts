import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemConfig";

/**
 * Validate system config creation via admin API and access control enforcement.
 *
 * Steps:
 *
 * 1. Register a new admin.
 * 2. Using the admin session, create a new unique system config entry (random
 *    key).
 * 3. Validate the response: ensure key/value/description are assigned as
 *    requested, response matches type.
 * 4. Attempt to create a second config with the same key, expect error (uniqueness
 *    enforced).
 * 5. Switch to a non-admin (unauthenticated) session and attempt to create a
 *    config, expect forbidden error.
 */
export async function test_api_system_config_creation_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const joinResult: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(joinResult);

  // 2. Create a new system config with a random key
  const configKey = `setting_${RandomGenerator.alphaNumeric(8)}`;
  const configValue = RandomGenerator.alphaNumeric(10);
  const configDescription = RandomGenerator.paragraph({ sentences: 4 });
  const configBody = {
    key: configKey,
    value: configValue,
    description: configDescription,
  } satisfies ICommunityPlatformSystemConfig.ICreate;
  const created: ICommunityPlatformSystemConfig =
    await api.functional.communityPlatform.admin.systemConfigs.create(
      connection,
      { body: configBody },
    );
  typia.assert(created);
  TestValidator.equals("config key assigned", created.key, configKey);
  TestValidator.equals("config value assigned", created.value, configValue);
  TestValidator.equals(
    "config description assigned",
    created.description,
    configDescription,
  );

  // 3. Attempt to create another config with the same key (should fail)
  await TestValidator.error("duplicate key should fail", async () => {
    await api.functional.communityPlatform.admin.systemConfigs.create(
      connection,
      { body: configBody },
    );
  });

  // 4. Switch to non-admin (simulate by empty headers / no auth) and attempt config creation (should be forbidden)
  const unauthConn = { ...connection, headers: {} };
  await TestValidator.error("non-admin cannot create config", async () => {
    await api.functional.communityPlatform.admin.systemConfigs.create(
      unauthConn,
      {
        body: {
          key: `unauth_${RandomGenerator.alphaNumeric(8)}`,
          value: RandomGenerator.alphaNumeric(5),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformSystemConfig.ICreate,
      },
    );
  });
}
