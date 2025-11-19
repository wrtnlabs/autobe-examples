import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemConfig";

/**
 * Validate system configuration deletion by admin.
 *
 * This test verifies:
 *
 * 1. Admin account creation and authentication.
 * 2. Existence of a configuration entry by configKey (assumed pre-created).
 * 3. Admin deletes the configuration (soft-deletion with audit: sets deleted_at).
 * 4. Attempting to delete again fails (error).
 * 5. Deleting some random non-existent config key fails (error).
 */
export async function test_api_system_config_removal_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin (unique email and password)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12) + ".Aa1$";
  const joinBody = {
    email: adminEmail,
    password: adminPassword as string &
      tags.MinLength<8> &
      tags.Format<"password">,
    href: "https://admin-join.example.com/" + RandomGenerator.alphaNumeric(6),
    referrer: "https://referrer.example.com/",
    ip: undefined,
  } satisfies IDiscussionBoardAdmin.IJoin;
  const admin: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: joinBody });
  typia.assert(admin);

  // 2. Assume a config with specific configKey exists (simulate pre-created entity)
  // We'll "pre-create" a configKey for the purpose of this test
  const configKey = `test_config_${RandomGenerator.alphaNumeric(8)}`;
  // Let's simulate that such a configKey exists in the system: Typically, we would use a POST endpoint to create it, but it's assumed

  // 3. Attempt to delete the system config for this key
  const deletion: IDiscussionBoardSystemConfig =
    await api.functional.discussionBoard.admin.systemConfigs.erase(connection, {
      configKey,
    });
  typia.assert(deletion);
  TestValidator.equals(
    "deleted_at is set after deletion",
    typeof deletion.deleted_at,
    "string",
  );
  TestValidator.equals(
    "deleted config key matches",
    deletion.config_key,
    configKey,
  );
  TestValidator.predicate(
    "record remains after soft-deletion",
    deletion.deleted_at !== null && deletion.deleted_at !== undefined,
  );

  // 4. Try to delete the same configKey again (should error)
  await TestValidator.error(
    "deleting the same configKey twice should fail",
    async () => {
      await api.functional.discussionBoard.admin.systemConfigs.erase(
        connection,
        { configKey },
      );
    },
  );

  // 5. Attempt to delete a random non-existent key
  const nonExistentKey = `no_config_${RandomGenerator.alphaNumeric(8)}`;
  await TestValidator.error(
    "deleting a non-existent configKey should fail",
    async () => {
      await api.functional.discussionBoard.admin.systemConfigs.erase(
        connection,
        { configKey: nonExistentKey },
      );
    },
  );
}
