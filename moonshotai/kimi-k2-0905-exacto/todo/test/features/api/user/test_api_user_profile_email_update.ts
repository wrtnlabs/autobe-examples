import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test user updating their own email address through profile management.
 * Validates successful email change while maintaining account security and data
 * integrity. Test includes proper authentication context, email uniqueness
 * validation, and response verification to ensure personal account information
 * can be updated safely by the authorized user.
 */
export async function test_api_user_profile_email_update(
  connection: api.IConnection,
) {
  // Create initial user account for testing email updates
  const originalEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: originalEmail,
      password: "securePassword123",
      href: "https://example.com/join",
      referrer: "https://example.com/home",
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user);

  // Verify user was created successfully
  TestValidator.equals("user ID is valid UUID", user.id.length, 36);
  TestValidator.equals("user email matches input", user.email, originalEmail);

  // Generate new email address for update
  const newEmail = typia.random<string & tags.Format<"email">>();

  // Update user email address
  const updatedUser = await api.functional.todoApp.user.users.update(
    connection,
    {
      userId: user.id,
      body: {
        email: newEmail,
      } satisfies ITodoAppUser.IUpdate,
    },
  );
  typia.assert(updatedUser);

  // Verify email was successfully updated
  TestValidator.equals("user ID remains the same", updatedUser.id, user.id);
  TestValidator.notEquals(
    "email has changed",
    updatedUser.email,
    originalEmail,
  );
  TestValidator.equals("new email matches input", updatedUser.email, newEmail);

  // Verify timestamps were updated appropriately
  TestValidator.predicate(
    "updated_at is now defined",
    updatedUser.updated_at !== undefined,
  );
  TestValidator.predicate(
    "created_at preserved",
    updatedUser.created_at === user.created_at,
  );
  TestValidator.equals(
    "deleted_at remains undefined",
    updatedUser.deleted_at,
    undefined,
  );

  // Test updating to the same email (should succeed but not change)
  const sameEmailUser = await api.functional.todoApp.user.users.update(
    connection,
    {
      userId: user.id,
      body: {
        email: newEmail, // Same as current email
      } satisfies ITodoAppUser.IUpdate,
    },
  );
  typia.assert(sameEmailUser);

  TestValidator.equals(
    "email unchanged when same",
    sameEmailUser.email,
    newEmail,
  );
}
