import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemConfig";

/**
 * Validate that updating a system configuration to a duplicate (category,
 * config_key) combination is rejected and does not succeed.
 *
 * Business context: Platform administrators (adminUser actors) manage global
 * system configurations stored in `community_platform_system_configs`. The
 * schema enforces a unique constraint on the pair (category, config_key). This
 * constraint must hold not only when creating new entries but also when
 * updating existing ones.
 *
 * This test covers the negative path where an admin attempts to rename a
 * configuration (Config B) so that it collides with an existing configuration
 * (Config A) under the same category. The backend must reject such updates.
 *
 * Steps:
 *
 * 1. Register an adminUser via POST /auth/adminUser/join to obtain an
 *    authenticated context (ICommunityPlatformAdminuser.IAuthorized) and let
 *    the SDK configure Authorization on the connection.
 * 2. As that adminUser, create two system configurations via POST
 *    /communityPlatform/adminUser/systemConfigs:
 *
 *    - Config A: category = "auth", config_key = "password_min_length", value = "8".
 *    - Config B: category = "auth", config_key = "password_history_depth", value =
 *         "5".
 * 3. Attempt to update Config B via PUT
 *    /communityPlatform/adminUser/systemConfigs/{systemConfigIdOfB} with an
 *    ICommunityPlatformSystemConfig.IUpdate body that sets config_key =
 *    "password_min_length" (matching Config A) and leaves category undefined so
 *    that the category remains "auth".
 * 4. Assert that the update call fails using TestValidator.error, indicating that
 *    the uniqueness constraint on (category, config_key) is enforced on
 *    updates.
 *
 * Note:
 *
 * - The provided SDK does not expose a GET endpoint for reading a system config
 *   by id, so we cannot re-fetch Config B from the backend. Instead, we limit
 *   validation to ensuring the update operation rejects, which implies no
 *   successful modification took place.
 */
export async function test_api_system_config_update_uniqueness_conflict(
  connection: api.IConnection,
) {
  // 1. Register an adminUser to obtain an authorized context.
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const admin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create Config A with category "auth" and key "password_min_length".
  const configABody = {
    category: "auth",
    config_key: "password_min_length",
    value: "8",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    is_active: true,
  } satisfies ICommunityPlatformSystemConfig.ICreate;

  const configA: ICommunityPlatformSystemConfig =
    await api.functional.communityPlatform.adminUser.systemConfigs.create(
      connection,
      {
        body: configABody,
      },
    );
  typia.assert(configA);

  TestValidator.equals(
    "configA category should be 'auth'",
    configA.category,
    "auth",
  );
  TestValidator.equals(
    "configA config_key should be 'password_min_length'",
    configA.config_key,
    "password_min_length",
  );

  // 3. Create Config B with a different key in the same category.
  const configBBody = {
    category: "auth",
    config_key: "password_history_depth",
    value: "5",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    is_active: true,
  } satisfies ICommunityPlatformSystemConfig.ICreate;

  const configB: ICommunityPlatformSystemConfig =
    await api.functional.communityPlatform.adminUser.systemConfigs.create(
      connection,
      {
        body: configBBody,
      },
    );
  typia.assert(configB);

  TestValidator.equals(
    "configB category should be 'auth'",
    configB.category,
    "auth",
  );
  TestValidator.equals(
    "configB config_key should be 'password_history_depth'",
    configB.config_key,
    "password_history_depth",
  );

  // 4. Attempt to update Config B so that its (category, config_key)
  //    collides with Config A's pair. This should be rejected.
  const conflictingUpdateBody = {
    config_key: "password_min_length",
  } satisfies ICommunityPlatformSystemConfig.IUpdate;

  await TestValidator.error(
    "updating configB to duplicate (category, config_key) should fail",
    async () => {
      await api.functional.communityPlatform.adminUser.systemConfigs.update(
        connection,
        {
          systemConfigId: configB.id,
          body: conflictingUpdateBody,
        },
      );
    },
  );
}
