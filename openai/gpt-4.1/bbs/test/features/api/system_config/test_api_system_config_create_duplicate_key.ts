import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemConfig";

/**
 * Test that system configuration creation fails when duplicating config_key.
 *
 * 1. Register and authenticate as admin
 * 2. Create config entry with unique config_key
 * 3. Attempt config creation with the same config_key
 * 4. Expect duplication error
 */
export async function test_api_system_config_create_duplicate_key(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate as new admin
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://admin-join.test/" + RandomGenerator.alphaNumeric(8),
    referrer: "https://landing.test/" + RandomGenerator.alphaNumeric(6),
    // Optionally add ip (randomly IPv4 or IPv6)
    ip:
      Math.random() > 0.5
        ? `192.168.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`
        : `2001:0db8:85a3:0000:0000:8a2e:0${Math.floor(Math.random() * 9)}00:${Math.floor(Math.random() * 9999)}`,
  } satisfies IDiscussionBoardAdmin.IJoin;
  const admin: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(admin);

  // Step 2: Create initial config with a unique config_key
  const configKey = "feature_toggle_" + RandomGenerator.alphaNumeric(10);
  const configCreateBody = {
    config_key: configKey,
    config_value: JSON.stringify({ enabled: true }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies IDiscussionBoardSystemConfig.ICreate;

  const config: IDiscussionBoardSystemConfig =
    await api.functional.discussionBoard.admin.systemConfigs.create(
      connection,
      { body: configCreateBody },
    );
  typia.assert(config);
  TestValidator.equals("config_key matches", config.config_key, configKey);

  // Step 3-4: Attempt to create the same config_key again and expect error
  await TestValidator.error("duplicate config_key should fail", async () => {
    await api.functional.discussionBoard.admin.systemConfigs.create(
      connection,
      { body: configCreateBody },
    );
  });
}
