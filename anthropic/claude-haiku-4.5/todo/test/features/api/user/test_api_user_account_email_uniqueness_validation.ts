import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test that user account update correctly validates email uniqueness
 * constraint.
 *
 * Creates two separate user accounts with different emails, then attempts to
 * update the second user's email to match the first user's email. The operation
 * should fail with appropriate error indicating the email is already in use.
 * Validates that the system prevents duplicate email addresses and enforces
 * the
 *
 * @@unique([email]) constraint from the database schema.
 *
 * Steps:
 * 1. Create first user account with initial email address
 * 2. Create second user account with different email address
 * 3. Attempt to update second user's email to match first user's email
 * 4. Verify operation fails with appropriate error
 * 5. Confirm second user's email remains unchanged
 */
export async function test_api_user_account_email_uniqueness_validation(
  connection: api.IConnection,
) {
  // Step 1: Create first user account with initial email
  const firstUserEmail = typia.random<string & tags.Format<"email">>();
  const firstUser: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: firstUserEmail,
        password: "ValidPassword123",
      } satisfies ITodoAppUser.IJoin,
    });
  typia.assert(firstUser);
  TestValidator.equals(
    "first user email matches",
    firstUser.email,
    firstUserEmail,
  );

  // Step 2: Create second user account with different email
  const secondUserEmail = typia.random<string & tags.Format<"email">>();
  const secondUser: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: secondUserEmail,
        password: "ValidPassword456",
      } satisfies ITodoAppUser.IJoin,
    });
  typia.assert(secondUser);
  TestValidator.equals(
    "second user email matches",
    secondUser.email,
    secondUserEmail,
  );
  TestValidator.notEquals(
    "user emails are different",
    firstUser.email,
    secondUser.email,
  );

  // Step 3: Attempt to update second user's email to match first user's email
  // This should fail due to unique constraint violation
  await TestValidator.error(
    "duplicate email update should fail with uniqueness constraint violation",
    async () => {
      await api.functional.todoApp.user.users.update(connection, {
        userId: secondUser.id,
        body: {
          email: firstUserEmail,
        } satisfies ITodoAppUser.IUpdate,
      });
    },
  );
}
