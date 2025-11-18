import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test email duplicate rejection on profile update.
 *
 * Validates that the API properly enforces the unique constraint on the email
 * field by rejecting attempts to update a user's email to an address already in
 * use by another account. This test ensures data integrity and prevents email
 * collisions in the system.
 *
 * Test workflow:
 *
 * 1. Register User A with email1@test.com
 * 2. Register User B with email2@test.com (automatically logs in as User B)
 * 3. Attempt to update User B's email to email1@test.com (User A's email)
 * 4. Verify update fails with appropriate error
 * 5. Confirm User B's email remains as email2@test.com
 */
export async function test_api_user_profile_email_duplicate_rejection(
  connection: api.IConnection,
) {
  // 1. Register User A with initial email
  const email1 = typia.random<string & tags.Format<"email">>();
  const userA: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: email1,
        password: "Password123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(userA);
  TestValidator.equals(
    "User A created with correct email",
    userA.email,
    email1,
  );

  // 2. Register User B with different email (this automatically logs in as User B)
  const email2 = typia.random<string & tags.Format<"email">>();
  const userB: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: email2,
        password: "Password123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(userB);
  TestValidator.equals(
    "User B created with correct email",
    userB.email,
    email2,
  );

  // 3. Attempt to update User B's email to User A's email (should fail)
  await TestValidator.error(
    "cannot update email to one already in use by another user",
    async () => {
      await api.functional.todoList.user.auth.user.profile.update(connection, {
        body: {
          email: email1,
        } satisfies ITodoListUser.IUpdate,
      });
    },
  );

  // 4. Verify User B's email remains unchanged
  const userBAfterAttempt: ITodoListUser =
    await api.functional.todoList.user.auth.user.profile.update(connection, {
      body: {} satisfies ITodoListUser.IUpdate,
    });
  typia.assert(userBAfterAttempt);
  TestValidator.equals(
    "User B email unchanged after failed update attempt",
    userBAfterAttempt.email,
    email2,
  );
}
