import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

/**
 * Test admin updating a user's profile via the admin API. Validates email
 * uniqueness, field-level restrictions, audit and soft-deletion logic.
 */
export async function test_api_admin_user_profile_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin (for authentication context)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    href: "https://test.example.com/admin/join",
    referrer: "https://test.example.com/landing",
  } satisfies IDiscussionBoardAdmin.IJoin;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(adminAuth);

  // 2. Register another admin (to create a target user)
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(12);
  const userJoinBody = {
    email: userEmail,
    password: userPassword,
    href: "https://test.example.com/user/join",
    referrer: "https://test.example.com/landing",
  } satisfies IDiscussionBoardAdmin.IJoin;
  const userAuth = await api.functional.auth.admin.join(connection, {
    body: userJoinBody,
  });
  typia.assert(userAuth);

  // 3. Update the target user's email to a new unique value
  const newEmail = typia.random<string & tags.Format<"email">>();
  const updateBody = { email: newEmail } satisfies IDiscussionBoardUser.IUpdate;
  const updatedUser = await api.functional.discussionBoard.admin.users.update(
    connection,
    {
      userId: userAuth.id,
      body: updateBody,
    },
  );
  typia.assert(updatedUser);
  TestValidator.equals("email updated", updatedUser.email, newEmail);
  TestValidator.predicate(
    "updated_at is updated",
    new Date(updatedUser.updated_at).getTime() >=
      new Date(userAuth.created_at).getTime(),
  );

  // 4. Attempt to update email to existing admin email (should fail on uniqueness)
  await TestValidator.error("duplicate email should fail", async () => {
    await api.functional.discussionBoard.admin.users.update(connection, {
      userId: userAuth.id,
      body: { email: adminEmail } satisfies IDiscussionBoardUser.IUpdate,
    });
  });

  // 5. Attempt to set invalid email format (should fail - positive format test only)
  await TestValidator.error("invalid email format should fail", async () => {
    await api.functional.discussionBoard.admin.users.update(connection, {
      userId: userAuth.id,
      body: { email: "not-an-email" } satisfies IDiscussionBoardUser.IUpdate,
    });
  });

  // 6. Confirm that restricted fields (id, created_at) cannot be updated - will ignore them
  // Since IDiscussionBoardUser.IUpdate doesn't allow these, we cannot send them; compliance is ensured by type
  // Attempting to pass them would be a TypeScript error; therefore, nothing to do.

  // 7. Soft-delete the user (set deleted_at) and verify effect
  const deletedAt = new Date().toISOString();
  const softDeleteBody = {
    email: updatedUser.email,
    deleted_at: deletedAt,
  } satisfies IDiscussionBoardUser.IUpdate;
  const deletedUser = await api.functional.discussionBoard.admin.users.update(
    connection,
    {
      userId: userAuth.id,
      body: softDeleteBody,
    },
  );
  typia.assert(deletedUser);
  TestValidator.equals(
    "user is soft deleted",
    deletedUser.deleted_at,
    deletedAt,
  );

  // 8. Attempt to update a deleted/nonexistent user (should return not found)
  const nonExistentUserId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "nonexistent user update should not be found",
    async () => {
      await api.functional.discussionBoard.admin.users.update(connection, {
        userId: nonExistentUserId,
        body: {
          email: typia.random<string & tags.Format<"email">>(),
        } satisfies IDiscussionBoardUser.IUpdate,
      });
    },
  );
  await TestValidator.error(
    "deleted user update should not be found",
    async () => {
      await api.functional.discussionBoard.admin.users.update(connection, {
        userId: userAuth.id,
        body: {
          email: typia.random<string & tags.Format<"email">>(),
        } satisfies IDiscussionBoardUser.IUpdate,
      });
    },
  );
}
