import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test email uniqueness validation when updating user account information.
 *
 * This test validates that the system properly enforces email uniqueness
 * constraints when users attempt to update their email addresses. It ensures
 * that no two users can have the same email address in the system, which is a
 * critical business rule for authentication and user identification.
 *
 * Test workflow:
 *
 * 1. Create first user account with a specific email address
 * 2. Create second user account with a different email address
 * 3. Attempt to update the second user's email to match the first user's email
 * 4. Verify the operation fails with appropriate validation error
 * 5. Confirm the second user's email remains unchanged
 * 6. Test that updating to the same email (no change) is allowed
 */
export async function test_api_user_profile_email_update_uniqueness(
  connection: api.IConnection,
) {
  // Step 1: Create first user account with a specific email
  const firstUserEmail = typia.random<string & tags.Format<"email">>();
  const firstUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: firstUserEmail,
        password: typia.random<string & tags.MinLength<8>>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(firstUser);

  // Step 2: Create second user account with a different email
  const secondUserEmail = typia.random<string & tags.Format<"email">>();
  const secondUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: secondUserEmail,
        password: typia.random<string & tags.MinLength<8>>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(secondUser);

  // Step 3: Attempt to update the second user's email to match the first user's email
  // This should fail due to email uniqueness constraint
  await TestValidator.error(
    "should reject duplicate email update",
    async () => {
      await api.functional.todoList.user.users.update(connection, {
        userId: secondUser.id,
        body: {
          email: firstUserEmail,
        } satisfies ITodoListUser.IUpdate,
      });
    },
  );

  // Step 4: Confirm the second user's email remains unchanged
  TestValidator.equals(
    "second user email should remain unchanged after failed update",
    secondUser.email,
    secondUserEmail,
  );

  // Step 5: Test that updating to the same email (no change) is allowed
  const sameEmailUpdate: ITodoListUser =
    await api.functional.todoList.user.users.update(connection, {
      userId: secondUser.id,
      body: {
        email: secondUserEmail,
      } satisfies ITodoListUser.IUpdate,
    });
  typia.assert(sameEmailUpdate);
  TestValidator.equals(
    "updating to same email should succeed",
    sameEmailUpdate.email,
    secondUserEmail,
  );
}
