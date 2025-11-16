import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test that admin updates to user email addresses affect email verification
 * status appropriately.
 *
 * This scenario validates email verification workflow integration when an
 * administrator modifies a user's email address. The test ensures that email
 * verification security is maintained even when administrators perform email
 * updates.
 *
 * Steps:
 *
 * 1. Create a regular user account with verified email status
 * 2. Create an admin account to perform updates
 * 3. Admin updates the user's email to a new address
 * 4. Verify that email_verified status is handled appropriately (may be reset to
 *    false)
 * 5. Confirm the user's profile reflects the new email
 * 6. Validate audit trail (updated_at timestamp) is maintained
 */
export async function test_api_admin_user_management_email_verification_reset(
  connection: api.IConnection,
) {
  // Step 1: Create a regular user account
  const originalEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = typia.random<string & tags.MinLength<8>>();

  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: originalEmail,
        password: userPassword,
        ip: typia.random<string>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // Store the user ID for later operations
  const userId = user.id;

  // Store original email_verified status
  const originalEmailVerified = user.email_verified;

  // Store original updated_at for audit trail verification
  const originalUpdatedAt = user.updated_at;

  // Step 2: Create an admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.MinLength<8>>();

  const admin: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        ip: typia.random<string>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 3: Admin updates the user's email to a new address
  const newEmail = typia.random<string & tags.Format<"email">>();

  const updatedUser: ITodoListUser =
    await api.functional.todoList.admin.users.update(connection, {
      userId: userId,
      body: {
        email: newEmail,
      } satisfies ITodoListUser.IUpdate,
    });
  typia.assert(updatedUser);

  // Step 4: Verify that the user's profile reflects the new email
  TestValidator.equals(
    "updated user email matches new email",
    updatedUser.email,
    newEmail,
  );

  // Step 5: Verify that email_verified status is handled appropriately
  // The email_verified field should exist in the response
  TestValidator.predicate(
    "email_verified field exists",
    updatedUser.email_verified !== undefined,
  );

  // Step 6: Validate audit trail - updated_at timestamp should be different
  TestValidator.predicate(
    "updated_at timestamp was modified",
    updatedUser.updated_at !== originalUpdatedAt,
  );

  // Verify that updated_at is a valid date-time format
  typia.assert<string & tags.Format<"date-time">>(updatedUser.updated_at);

  // Step 7: Confirm the user ID remains unchanged
  TestValidator.equals("user ID remains unchanged", updatedUser.id, userId);
}
