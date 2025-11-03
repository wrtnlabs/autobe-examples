import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";

/**
 * Verify permanent administrator account deletion by the admin actor.
 *
 * 1. Register a new admin using realistic credentials
 * 2. Confirm profile structure and token schema
 * 3. Use the token context to call DELETE /discussionBoard/admin/admins/{adminId}
 *    with own id
 * 4. Confirm that the account is deleted with no recovery or error
 * 5. Ensure further attempts to use the deleted account/sessions fail with errors
 */
export async function test_api_admin_account_permanent_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new administrator
  const adminBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(2),
    avatar_url:
      RandomGenerator.pick([
        null,
        undefined,
        "https://example.com/avatar.png",
      ]) ?? undefined,
  } satisfies IDiscussionBoardAdmin.ICreate;
  const admin: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminBody });
  typia.assert(admin);

  // 2. Attempt to delete own account
  await api.functional.discussionBoard.admin.admins.erase(connection, {
    adminId: admin.id,
  });

  // 3. Try to perform any action with the old connection (should be unauthorized/deleted)
  await TestValidator.error(
    "cannot delete already deleted admin account again",
    async () => {
      await api.functional.discussionBoard.admin.admins.erase(connection, {
        adminId: admin.id,
      });
    },
  );
}
