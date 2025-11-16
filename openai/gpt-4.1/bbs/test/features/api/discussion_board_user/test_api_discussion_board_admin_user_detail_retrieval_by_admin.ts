import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuthorizationToken";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

/**
 * Validate that an authenticated admin can retrieve detailed account
 * information for any user on the discussion board.
 *
 * 1. Register an admin account (session is established).
 * 2. Create two simulated users: one intended to represent an active user, and one
 *    simulating a soft-deleted user (by generating a random deleted_at value).
 * 3. As admin, fetch details for both users via
 *    /discussionBoard/admin/users/{userId}.
 * 4. Validate that all fields—id, email, is_email_verified, is_active, is_blocked,
 *    created_at, updated_at, deleted_at—are present and have expected values.
 * 5. Confirm that the soft-deleted user's details (including deleted_at field) are
 *    retrievable.
 * 6. Assert that access control works by attempting unauthorized access if
 *    possible (here this step is implicit as admin join is a precondition for
 *    the endpoint to work).
 */
export async function test_api_discussion_board_admin_user_detail_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Register admin and establish session
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12) + "!Aa1";
  const adminHref = "https://admin.test/" + RandomGenerator.alphaNumeric(8);
  const adminReferrer =
    "https://referrer.test/" + RandomGenerator.alphaNumeric(8);
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: adminHref,
      referrer: adminReferrer,
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);

  // 2. Create two users in mock/test context: one active, one soft-deleted
  // In absence of a user creation API, simulate users with typia.random
  const activeUser: IDiscussionBoardUser = typia.random<IDiscussionBoardUser>();
  // For soft-deleted, ensure deleted_at is set to a valid ISO datetime
  const softDeletedUser: IDiscussionBoardUser = {
    ...typia.random<IDiscussionBoardUser>(),
    deleted_at: new Date().toISOString() as string & tags.Format<"date-time">,
  };

  // 3. Admin retrieves active user details
  const fetchedActive = await api.functional.discussionBoard.admin.users.at(
    connection,
    {
      userId: activeUser.id,
    },
  );
  typia.assert(fetchedActive);
  TestValidator.equals(
    "active user: id matches",
    fetchedActive.id,
    activeUser.id,
  );
  TestValidator.equals(
    "active user: email matches",
    fetchedActive.email,
    activeUser.email,
  );
  TestValidator.equals(
    "active user: is_email_verified matches",
    fetchedActive.is_email_verified,
    activeUser.is_email_verified,
  );
  TestValidator.equals(
    "active user: is_active matches",
    fetchedActive.is_active,
    activeUser.is_active,
  );
  TestValidator.equals(
    "active user: is_blocked matches",
    fetchedActive.is_blocked,
    activeUser.is_blocked,
  );
  TestValidator.equals(
    "active user: created_at matches",
    fetchedActive.created_at,
    activeUser.created_at,
  );
  TestValidator.equals(
    "active user: updated_at matches",
    fetchedActive.updated_at,
    activeUser.updated_at,
  );
  TestValidator.equals(
    "active user: deleted_at matches",
    fetchedActive.deleted_at,
    activeUser.deleted_at,
  );

  // 4. Admin retrieves soft-deleted user details
  const fetchedSoftDeleted =
    await api.functional.discussionBoard.admin.users.at(connection, {
      userId: softDeletedUser.id,
    });
  typia.assert(fetchedSoftDeleted);
  TestValidator.equals(
    "soft-deleted user: id matches",
    fetchedSoftDeleted.id,
    softDeletedUser.id,
  );
  TestValidator.equals(
    "soft-deleted user: email matches",
    fetchedSoftDeleted.email,
    softDeletedUser.email,
  );
  TestValidator.equals(
    "soft-deleted user: is_email_verified matches",
    fetchedSoftDeleted.is_email_verified,
    softDeletedUser.is_email_verified,
  );
  TestValidator.equals(
    "soft-deleted user: is_active matches",
    fetchedSoftDeleted.is_active,
    softDeletedUser.is_active,
  );
  TestValidator.equals(
    "soft-deleted user: is_blocked matches",
    fetchedSoftDeleted.is_blocked,
    softDeletedUser.is_blocked,
  );
  TestValidator.equals(
    "soft-deleted user: created_at matches",
    fetchedSoftDeleted.created_at,
    softDeletedUser.created_at,
  );
  TestValidator.equals(
    "soft-deleted user: updated_at matches",
    fetchedSoftDeleted.updated_at,
    softDeletedUser.updated_at,
  );
  TestValidator.equals(
    "soft-deleted user: deleted_at matches (should be non-null)",
    fetchedSoftDeleted.deleted_at,
    softDeletedUser.deleted_at,
  );
}
