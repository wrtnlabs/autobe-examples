import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test user-initiated email address change in profile update.
 *
 * This test validates email format validation, uniqueness checking to prevent
 * duplicate email addresses, password security requirements, and atomic
 * handling of combined email and password updates.
 */
export async function test_api_user_profile_self_update_email_change(
  connection: api.IConnection,
) {
  // Step 1: Create first user account for profile update testing
  const firstUserEmail: string = typia.random<string & tags.Format<"email">>();
  const firstUserJoin = {
    email: firstUserEmail,
    password: "TestPassword123", // Valid password with mixed case and numbers
    href: "https://example.com/profile",
    referrer: "https://example.com/join",
  } satisfies ITodoAppUser.IJoin;

  const firstUser: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: firstUserJoin });
  typia.assert(firstUser);

  // Step 2: Create second user account to test email uniqueness validation
  const secondUserEmail: string = typia.random<string & tags.Format<"email">>();
  const secondUserJoin = {
    email: secondUserEmail,
    password: "SecondPass456",
    href: "https://example.com/profile",
    referrer: "https://example.com/join",
  } satisfies ITodoAppUser.IJoin;

  const secondUser: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: secondUserJoin });
  typia.assert(secondUser);

  // Step 3: Test valid email change - user should be able to change to a new unique email
  const newValidEmail: string = typia.random<string & tags.Format<"email">>();
  const validUpdateBody = {
    email: newValidEmail,
  } satisfies ITodoAppUser.IUpdate;

  const updatedUser: ITodoAppUser =
    await api.functional.todoApp.user.auth.users.profile.update(connection, {
      userId: firstUser.id,
      body: validUpdateBody,
    });
  typia.assert(updatedUser);
  TestValidator.equals(
    "email address should be updated",
    updatedUser.email,
    newValidEmail,
  );
  TestValidator.equals(
    "user ID should remain the same",
    updatedUser.id,
    firstUser.id,
  );

  // Step 4: Test duplicate email - should fail when trying to use another user's email
  const duplicateUpdateBody = {
    email: secondUserEmail,
  } satisfies ITodoAppUser.IUpdate;

  await TestValidator.error("duplicate email should be rejected", async () => {
    await api.functional.todoApp.user.auth.users.profile.update(connection, {
      userId: updatedUser.id,
      body: duplicateUpdateBody,
    });
  });

  // Step 5: Test password update with valid security requirements
  const newPassword = "NewPassword789";
  const passwordUpdateBody = {
    password_hash: newPassword,
  } satisfies ITodoAppUser.IUpdate;

  const passwordUpdatedUser: ITodoAppUser =
    await api.functional.todoApp.user.auth.users.profile.update(connection, {
      userId: updatedUser.id,
      body: passwordUpdateBody,
    });
  typia.assert(passwordUpdatedUser);
  TestValidator.equals(
    "user ID should remain consistent after password update",
    passwordUpdatedUser.id,
    updatedUser.id,
  );

  // Step 6: Test atomic update with both email and password changes
  const finalEmail: string = typia.random<string & tags.Format<"email">>();
  const finalPassword = "FinalPass123";
  const atomicUpdateBody = {
    email: finalEmail,
    password_hash: finalPassword,
  } satisfies ITodoAppUser.IUpdate;

  const finalUser: ITodoAppUser =
    await api.functional.todoApp.user.auth.users.profile.update(connection, {
      userId: passwordUpdatedUser.id,
      body: atomicUpdateBody,
    });
  typia.assert(finalUser);
  TestValidator.equals(
    "email should be updated atomically",
    finalUser.email,
    finalEmail,
  );
  TestValidator.equals(
    "user ID should remain consistent through atomic update",
    finalUser.id,
    passwordUpdatedUser.id,
  );

  // Step 7: Verify timestamps are properly updated
  TestValidator.predicate(
    "updated_at timestamp should be newer than creation time",
    Date.parse(finalUser.updated_at) >= Date.parse(firstUser.created_at),
  );
  TestValidator.predicate(
    "created_at timestamp should remain unchanged",
    finalUser.created_at === firstUser.created_at,
  );
}
