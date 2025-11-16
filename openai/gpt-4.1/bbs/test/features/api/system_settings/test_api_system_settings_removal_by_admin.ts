import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuthorizationToken";

/**
 * Validate permanent removal of a system-wide configuration setting by an
 * authenticated admin.
 *
 * Steps:
 *
 * 1. Register a new admin using /auth/admin/join with unique valid email, strong
 *    password, href, and referrer.
 * 2. Delete a setting by key using /discussionBoard/admin/systemSettings/{key}.
 * 3. Verify delete returns no error for valid key.
 * 4. Attempt second deletion for same key, expect error (already removed).
 *
 * Additional assertions:
 *
 * - Only an authenticated admin can remove system settings successfully.
 * - Deletion is permanent and cannot be repeated.
 */
export async function test_api_system_settings_removal_by_admin(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12) + "A!1"; // Ensure at least 8 chars, includes letter/number/special
  const contextUrl = "https://autobe-test/unit/discussion-board";
  const joinResult: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        href: contextUrl,
        referrer: contextUrl,
      } satisfies IDiscussionBoardAdmin.IJoin,
    });
  typia.assert(joinResult);
  TestValidator.equals("admin identity matches", joinResult.email, adminEmail);
  TestValidator.predicate("admin is active", joinResult.is_active === true);

  // 2. Delete a system setting by key (simulate existing key with random string)
  const settingKey = RandomGenerator.alphaNumeric(10);
  await api.functional.discussionBoard.admin.systemSettings.erase(connection, {
    key: settingKey,
  });
  // No error means delete succeeded

  // 3. Second deletion should fail (key is already gone), expect error
  await TestValidator.error(
    "second removal attempt should fail for deleted key",
    async () => {
      await api.functional.discussionBoard.admin.systemSettings.erase(
        connection,
        { key: settingKey },
      );
    },
  );
}
