import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuthorizationToken";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

/**
 * Test soft deletion of a discussion board user by an admin and audit the
 * effect.
 *
 * 1. Register a new admin account (join as admin) to authenticate as
 *    administrator.
 * 2. Generate a random user id (uuid) for the target user.
 * 3. Call the API as admin to delete the user (soft deletion: sets deleted_at).
 * 4. Assert that the returned user object has deleted_at as a non-null string.
 * 5. Type-validate the user with typia.assert.
 * 6. Assert that deleted_at is a valid ISO timestamp (not null/undefined).
 * 7. Check that the user id matches the one requested for deletion.
 * 8. Ensure no extra/spurious properties beyond schema contract are present
 *    (handled by typia.assert).
 */
export async function test_api_discussion_board_admin_user_soft_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin account (join as admin)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://admin.discussionboard.local/register",
    referrer: "https://discussionboard.local/",
  } satisfies IDiscussionBoardAdmin.IJoin;
  const admin: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(admin);
  TestValidator.equals("admin email matches", admin.email, adminJoinBody.email);
  TestValidator.predicate("admin is active", admin.is_active === true);

  // 2. Generate a random user ID to test deletion (simulate an existing user)
  const userId = typia.random<string & tags.Format<"uuid">>();

  // 3. Call the API as admin to delete the user (soft deletion)
  const deletedUser: IDiscussionBoardUser =
    await api.functional.discussionBoard.admin.users.erase(connection, {
      userId,
    });
  typia.assert(deletedUser);
  TestValidator.equals(
    "deleted user id should match target",
    deletedUser.id,
    userId,
  );
  TestValidator.predicate(
    "deleted_at field should not be null after soft deletion",
    deletedUser.deleted_at !== null && deletedUser.deleted_at !== undefined,
  );
  TestValidator.predicate(
    "deleted_at should be a valid ISO date-time string",
    typeof deletedUser.deleted_at === "string" &&
      /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/.test(
        deletedUser.deleted_at!,
      ),
  );
}
