import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

export async function test_api_user_profile_update_complete_replacement(
  connection: api.IConnection,
) {
  // Step 1: Create user account with initial profile data
  const originalEmail = typia.random<string & tags.Format<"email">>();
  const originalPassword = RandomGenerator.alphaNumeric(12);
  const href = "https://example.com/register";
  const referrer = "https://example.com/home";

  const initialUser = await api.functional.auth.user.join(connection, {
    body: {
      email: originalEmail,
      password: originalPassword,
      href,
      referrer,
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(initialUser);

  // Step 2: Store original timestamps for audit trail verification
  const originalCreatedAt = initialUser.created_at;
  const originalUpdatedAt = initialUser.updated_at;

  // Step 3: Update email address with new valid email
  const newEmail = typia.random<string & tags.Format<"email">>();
  const emailUpdateResponse =
    await api.functional.todoApp.user.auth.users.profile.update(connection, {
      userId: initialUser.id,
      body: {
        email: newEmail,
      } satisfies ITodoAppUser.IUpdate,
    });
  typia.assert(emailUpdateResponse);

  // Verify email was updated and audit trail was maintained
  TestValidator.equals(
    "email updated successfully",
    emailUpdateResponse.email,
    newEmail,
  );
  TestValidator.predicate(
    "updated_at timestamp changed",
    emailUpdateResponse.updated_at > originalUpdatedAt,
  );
  TestValidator.equals(
    "created_at timestamp unchanged",
    emailUpdateResponse.created_at,
    originalCreatedAt,
  );

  // Step 4: Update password - use a hash-like value that matches the DTO expectations
  const hashLikePassword = RandomGenerator.alphaNumeric(60); // Generate a longer string resembling a hash
  const passwordUpdateResponse =
    await api.functional.todoApp.user.auth.users.profile.update(connection, {
      userId: initialUser.id,
      body: {
        password_hash: hashLikePassword,
      } satisfies ITodoAppUser.IUpdate,
    });
  typia.assert(passwordUpdateResponse);

  // Verify only password hash changed (email remained from previous update)
  TestValidator.equals(
    "email remains unchanged",
    passwordUpdateResponse.email,
    newEmail,
  );
  TestValidator.predicate(
    "password hash exists",
    passwordUpdateResponse.password_hash.length > 0,
  );
  TestValidator.predicate(
    "updated_at timestamp updated",
    passwordUpdateResponse.updated_at > emailUpdateResponse.updated_at,
  );

  // Step 5: Test email format validation with invalid email
  await TestValidator.error("invalid email format should fail", async () => {
    await api.functional.todoApp.user.auth.users.profile.update(connection, {
      userId: initialUser.id,
      body: {
        email: "invalid-email",
      } satisfies ITodoAppUser.IUpdate,
    });
  });

  // Step 6: Test unique email constraint - create fresh unauthenticated connection for second user
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  const anotherEmail = typia.random<string & tags.Format<"email">>();
  const anotherUser = await api.functional.auth.user.join(unauthConn, {
    body: {
      email: anotherEmail,
      password: RandomGenerator.alphaNumeric(12),
      href,
      referrer,
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(anotherUser);

  // Try to update with the other user's email
  await TestValidator.error("duplicate email should fail", async () => {
    await api.functional.todoApp.user.auth.users.profile.update(connection, {
      userId: initialUser.id,
      body: {
        email: anotherUser.email,
      } satisfies ITodoAppUser.IUpdate,
    });
  });

  // Step 7: Complete profile replacement update
  const finalEmail = typia.random<string & tags.Format<"email">>();
  const finalHash = RandomGenerator.alphaNumeric(60); // Generate a valid hash-like string
  const completeUpdateResponse =
    await api.functional.todoApp.user.auth.users.profile.update(connection, {
      userId: initialUser.id,
      body: {
        email: finalEmail,
        password_hash: finalHash,
      } satisfies ITodoAppUser.IUpdate,
    });
  typia.assert(completeUpdateResponse);

  // Verify complete update
  TestValidator.equals(
    "both email and password updated",
    completeUpdateResponse.email,
    finalEmail,
  );
  TestValidator.predicate(
    "password hash updated",
    completeUpdateResponse.password_hash !==
      passwordUpdateResponse.password_hash,
  );
  TestValidator.predicate(
    "final updated timestamp",
    completeUpdateResponse.updated_at > passwordUpdateResponse.updated_at,
  );

  // Step 8: Test empty update (no changes)
  const noChangeResponse =
    await api.functional.todoApp.user.auth.users.profile.update(connection, {
      userId: initialUser.id,
      body: {} satisfies ITodoAppUser.IUpdate,
    });
  typia.assert(noChangeResponse);

  // Verify no actual changes occurred
  TestValidator.equals("no email change", noChangeResponse.email, finalEmail);
  TestValidator.equals(
    "no timestamp change",
    noChangeResponse.updated_at,
    completeUpdateResponse.updated_at,
  );
}
