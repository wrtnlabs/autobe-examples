import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemConfig";

/**
 * Verifies that attempting to update a non-existent discussion board system
 * configuration entry returns an error.
 *
 * Steps:
 *
 * 1. Register and authenticate as a new admin
 * 2. Attempt to update a system config with a non-existent config_key
 * 3. Expect the operation to fail with an error, validating business error
 *    handling for missing resources.
 */
export async function test_api_system_config_update_not_found(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as a new admin
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://example.com/register",
    referrer: "https://example.com/landing",
  } satisfies IDiscussionBoardAdmin.IJoin;
  const admin: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(admin);

  // 2. Attempt to update a non-existent system config
  const nonExistentKey = `not_found_config_${RandomGenerator.alphaNumeric(8)}`;
  const updateBody = {
    config_value: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IDiscussionBoardSystemConfig.IUpdate;

  // 3. Validate that updating a non-existent config_key fails with an error
  await TestValidator.error(
    "should error when updating a non-existent system config entry",
    async () => {
      await api.functional.discussionBoard.admin.systemConfigs.update(
        connection,
        {
          configKey: nonExistentKey,
          body: updateBody,
        },
      );
    },
  );
}
