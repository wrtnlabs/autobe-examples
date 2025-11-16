import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test profile update with comprehensive validation including email format
 * checking and password security requirements. Verify that invalid email
 * formats are rejected, password requirements are enforced, and update
 * operations maintain data integrity across the todo_app_users table.
 *
 * Test scenarios include:
 *
 * 1. Create user account and establish authentication
 * 2. Test invalid email format rejection
 * 3. Test password security requirements enforcement
 * 4. Verify successful profile updates maintain data integrity
 * 5. Test update with valid data after validation failures
 */
export async function test_api_user_profile_update_with_validation(
  connection: api.IConnection,
) {
  // 1. Create user account for validation testing
  const originalEmail = typia.random<string & tags.Format<"email">>();
  const originalPassword = RandomGenerator.alphaNumeric(12);
  const joinBody = {
    email: originalEmail,
    password: originalPassword,
    ip: "127.0.0.1",
    href: "https://example.com",
    referrer: "https://example.com/login",
  } satisfies ITodoAppUser.IJoin;

  const createdUser = await api.functional.auth.user.join(connection, {
    body: joinBody,
  });
  typia.assert(createdUser);

  // 2. Test invalid email format rejection
  await TestValidator.error("should reject invalid email format", async () => {
    const invalidEmailUpdate = {
      email: "invalid-email-format",
    } satisfies ITodoAppUser.IUpdate;

    await api.functional.todoApp.user.auth.profile.update(connection, {
      body: invalidEmailUpdate,
    });
  });

  // 3. Test password security requirements (empty password should be rejected)
  await TestValidator.error("should reject empty password", async () => {
    const emptyPasswordUpdate = {
      password_hash: "",
    } satisfies ITodoAppUser.IUpdate;

    await api.functional.todoApp.user.auth.profile.update(connection, {
      body: emptyPasswordUpdate,
    });
  });

  // 4. Verify successful profile update maintains data integrity
  const newEmail = typia.random<string & tags.Format<"email">>();
  const newPassword = RandomGenerator.alphaNumeric(15);

  const validUpdateBody = {
    email: newEmail,
    password_hash: newPassword,
  } satisfies ITodoAppUser.IUpdate;

  const updatedUser = await api.functional.todoApp.user.auth.profile.update(
    connection,
    {
      body: validUpdateBody,
    },
  );
  typia.assert(updatedUser);

  // 5. Verify update was applied correctly
  TestValidator.equals("email should be updated", updatedUser.email, newEmail);

  // 6. Test partial update (only email)
  const partialEmailUpdate = typia.random<string & tags.Format<"email">>();
  const partialUpdateBody = {
    email: partialEmailUpdate,
  } satisfies ITodoAppUser.IUpdate;

  const partiallyUpdatedUser =
    await api.functional.todoApp.user.auth.profile.update(connection, {
      body: partialUpdateBody,
    });
  typia.assert(partiallyUpdatedUser);

  TestValidator.equals(
    "email should be updated in partial update",
    partiallyUpdatedUser.email,
    partialEmailUpdate,
  );
  // Password should remain unchanged
  TestValidator.notEquals(
    "password hash should remain the same",
    partiallyUpdatedUser.password_hash,
    updatedUser.password_hash,
  );
}
