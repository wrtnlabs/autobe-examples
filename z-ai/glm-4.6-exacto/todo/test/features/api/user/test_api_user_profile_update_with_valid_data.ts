import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Validate successful user profile update operations for registered users.
 *
 * This test covers the full workflow of account self-modification:
 *
 * 1. Register a new user via join.
 * 2. Immediately authenticate as the new user (handled via token on join).
 * 3. Update the user's email to a new unique address (format- and
 *    uniqueness-checked).
 * 4. Confirm the response returns the correct user (id must match, updated_at must
 *    update, and email changes as intended).
 * 5. Update the user's password to a new (different) valid password.
 * 6. Confirm updated_at changes again and no sensitive password hash/field is
 *    leaked in the response.
 * 7. Attempt a forbidden update as an attacker by using a different userId
 *    (simulate another user's id if desired) and check for correct error
 *    handling (should throw, forbidden).
 */
export async function test_api_user_profile_update_with_valid_data(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const userJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://todo-app.example.com/signup",
    referrer: "https://todo-app.example.com/landing",
  } satisfies ITodoAppUser.IJoin;
  const authorized = await api.functional.auth.user.join(connection, {
    body: userJoinBody,
  });
  typia.assert(authorized);

  // Remember initial user info
  const origId = authorized.id;
  const origEmail = authorized.email;
  const origCreatedAt = authorized.created_at;
  const origUpdatedAt = authorized.updated_at;

  // 2. Successfully update the email to a NEW valid/unique address
  const newEmail = typia
    .random<string & tags.Format<"email">>()
    .replace("@", `+updated${Date.now().toString()}@`); // ensure uniqueness
  const emailUpdateBody = { email: newEmail } satisfies ITodoAppUser.IUpdate;

  // PUT /todoApp/user/users/{userId}
  const afterEmailUpdate = await api.functional.todoApp.user.users.update(
    connection,
    {
      userId: origId,
      body: emailUpdateBody,
    },
  );
  typia.assert(afterEmailUpdate);
  TestValidator.equals(
    "email updated successfully",
    afterEmailUpdate.email,
    newEmail,
  );
  TestValidator.equals("user id immutable", afterEmailUpdate.id, origId);
  TestValidator.notEquals(
    "updated_at advanced after email change",
    afterEmailUpdate.updated_at,
    origUpdatedAt,
  );
  TestValidator.equals(
    "created_at did not change on update",
    afterEmailUpdate.created_at,
    origCreatedAt,
  );
  TestValidator.equals(
    "deleted_at remains unchanged (not deleted)",
    afterEmailUpdate.deleted_at,
    authorized.deleted_at,
  );
  TestValidator.notEquals(
    "email really changed",
    afterEmailUpdate.email,
    origEmail,
  );

  // 3. Successfully update the password (and only the password)
  const newPassword = RandomGenerator.alphaNumeric(15);
  const pwdUpdateBody = {
    password: newPassword,
  } satisfies ITodoAppUser.IUpdate;
  const afterPwdUpdate = await api.functional.todoApp.user.users.update(
    connection,
    {
      userId: origId,
      body: pwdUpdateBody,
    },
  );
  typia.assert(afterPwdUpdate);
  TestValidator.equals(
    "email stays the same when only password changes",
    afterPwdUpdate.email,
    newEmail,
  );
  TestValidator.equals(
    "user id remains the same after password change",
    afterPwdUpdate.id,
    origId,
  );
  TestValidator.notEquals(
    "updated_at changed after password update",
    afterPwdUpdate.updated_at,
    afterEmailUpdate.updated_at,
  );
  TestValidator.equals(
    "created_at not altered even after password update",
    afterPwdUpdate.created_at,
    origCreatedAt,
  );
  TestValidator.equals(
    "deleted_at still not set (active account)",
    afterPwdUpdate.deleted_at,
    authorized.deleted_at,
  );
  // Ensure password field is never present in response (API never leaks it)
  TestValidator.predicate(
    "no 'password' or 'password_hash' in update response",
    !Object.prototype.hasOwnProperty.call(afterPwdUpdate, "password") &&
      !Object.prototype.hasOwnProperty.call(afterPwdUpdate, "password_hash"),
  );

  // 4. Try to update another user's profile (should be forbidden)
  const attackerUserId = typia.random<string & tags.Format<"uuid">>();
  if (attackerUserId !== origId) {
    await TestValidator.error(
      "cannot update another user's profile",
      async () => {
        await api.functional.todoApp.user.users.update(connection, {
          userId: attackerUserId,
          body: { email: newEmail } satisfies ITodoAppUser.IUpdate,
        });
      },
    );
  }
}
