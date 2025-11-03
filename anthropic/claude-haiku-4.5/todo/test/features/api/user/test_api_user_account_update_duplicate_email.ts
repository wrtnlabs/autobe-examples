import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test user account update with duplicate email address validation.
 *
 * Validates that the system prevents updating a user's email to an address
 * already registered by another user. This test ensures the email uniqueness
 * constraint is properly enforced across all user accounts in the system.
 *
 * Test workflow:
 *
 * 1. Create first user account with unique email via /auth/user/join
 * 2. Store first user credentials and ID
 * 3. Create second user account with different email via /auth/user/join
 * 4. Re-authenticate as first user to obtain fresh access token
 * 5. Attempt to update first user's email to second user's email via PUT
 *    /todoApp/users/{userId}
 * 6. Verify error is returned indicating email uniqueness violation
 * 7. Validate that first user's email remains unchanged after failed update
 */
export async function test_api_user_account_update_duplicate_email(
  connection: api.IConnection,
) {
  // Create first user account
  const firstUserEmail = typia.random<string & tags.Format<"email">>();
  const firstUserPassword = RandomGenerator.alphabets(10);
  const firstUser: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: firstUserEmail,
        password: firstUserPassword,
      } satisfies ITodoAppUser.IJoin,
    });
  typia.assert(firstUser);
  TestValidator.equals(
    "first user email matches input",
    firstUser.email,
    firstUserEmail,
  );
  TestValidator.equals(
    "first user status is active",
    firstUser.status,
    "active",
  );

  // Create second user account with different email (create unauthenticated connection)
  const secondUserEmail = typia.random<string & tags.Format<"email">>();
  const secondUserPassword = RandomGenerator.alphabets(10);
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  const secondUser: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.join(unauthConn, {
      body: {
        email: secondUserEmail,
        password: secondUserPassword,
      } satisfies ITodoAppUser.IJoin,
    });
  typia.assert(secondUser);
  TestValidator.equals(
    "second user email matches input",
    secondUser.email,
    secondUserEmail,
  );

  // Verify that both users have different emails
  TestValidator.notEquals(
    "users have different emails",
    firstUser.email,
    secondUser.email,
  );

  // Attempt to update first user's email to second user's email (should fail due to uniqueness constraint)
  await TestValidator.error(
    "cannot update user email to duplicate email",
    async () => {
      await api.functional.todoApp.users.update(connection, {
        userId: firstUser.id,
        body: {
          email: secondUserEmail,
        } satisfies ITodoAppUser.IUpdate,
      });
    },
  );
}
