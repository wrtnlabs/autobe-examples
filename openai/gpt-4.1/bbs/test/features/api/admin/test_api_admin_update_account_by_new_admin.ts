import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuthorizationToken";

/**
 * Test updating a discussion board administrator's account details as a newly
 * registered admin.
 *
 * Scenario steps:
 *
 * 1. Register a new admin and authenticate them.
 * 2. Update the admin's email, password, is_email_verified, is_active, and
 *    is_blocked flags.
 * 3. Check that all changes are reflected in the update response.
 */
export async function test_api_admin_update_account_by_new_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin (dependency)
  const adminJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) + "!A1$",
    href: "https://test-e2e.discussion-board.join",
    referrer: "https://test-e2e.discussion-board.home",
  } satisfies IDiscussionBoardAdmin.IJoin;
  const adminAuth: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinInput });
  typia.assert(adminAuth);

  // 2. Prepare update info with new credential and toggled status
  const updatedEmail = typia.random<string & tags.Format<"email">>();
  // Ensure strong password: 12+chars, includes letter, number, special
  const updatedPassword = RandomGenerator.alphaNumeric(8) + "#Aa7%$";
  const updateBody = {
    email: updatedEmail,
    password: updatedPassword,
    is_email_verified: !adminAuth.is_email_verified,
    is_active: !adminAuth.is_active,
    is_blocked: !adminAuth.is_blocked,
  } satisfies IDiscussionBoardAdmin.IUpdate;

  // 3. Update the admin account
  const updated: IDiscussionBoardAdmin =
    await api.functional.discussionBoard.admin.admins.update(connection, {
      adminId: adminAuth.id,
      body: updateBody,
    });
  typia.assert(updated);

  // 4. Check that all fields are updated and reflected
  TestValidator.equals("updated admin id preserved", updated.id, adminAuth.id);
  TestValidator.equals(
    "updated admin email matches",
    updated.email,
    updatedEmail,
  );
  TestValidator.equals(
    "updated is_email_verified toggled",
    updated.is_email_verified,
    updateBody.is_email_verified,
  );
  TestValidator.equals(
    "updated is_active toggled",
    updated.is_active,
    updateBody.is_active,
  );
  TestValidator.equals(
    "updated is_blocked toggled",
    updated.is_blocked,
    updateBody.is_blocked,
  );
  TestValidator.predicate(
    "updated date is after or equal to created date",
    new Date(updated.updated_at).getTime() >=
      new Date(adminAuth.created_at).getTime(),
  );
  TestValidator.predicate(
    "created_at unchanged",
    updated.created_at === adminAuth.created_at,
  );
  TestValidator.equals(
    "deleted_at unchanged",
    updated.deleted_at,
    adminAuth.deleted_at ?? null,
  );
}
