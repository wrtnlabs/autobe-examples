import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validates that attempting to update a user's email to one already in use is
 * rejected.
 *
 * This scenario tests the email uniqueness constraint on the Todo List user
 * profile update endpoint:
 *
 * 1. Register User A with a unique randomly generated email.
 * 2. Register User B with another unique email.
 * 3. While authenticated as User B, attempt to update B's email to User A's email
 *    via PUT /todoList/user/users/{userId}.
 * 4. Validate that the update is rejected (error thrown).
 * 5. Reauthenticate as User A (if necessary) and confirm User A's record is
 *    unchanged (email remains the same).
 *
 * This ensures that the API enforces a unique constraint for user emails and
 * prevents cross-user email takeover.
 */
export async function test_api_user_profile_update_email_uniqueness_violation(
  connection: api.IConnection,
) {
  // 1. Register User A
  const emailA = typia.random<string & tags.Format<"email">>();
  const passwordA = typia.random<string & tags.Format<"password">>();
  const hrefA = typia.random<string & tags.Format<"uri">>();
  const referrerA = typia.random<string & tags.Format<"uri">>();

  const userA = await api.functional.auth.user.join(connection, {
    body: {
      email: emailA,
      password: passwordA,
      href: hrefA,
      referrer: referrerA,
      // optional ip: test with undefined
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(userA);

  // 2. Register User B
  const emailB = typia.random<string & tags.Format<"email">>();
  const passwordB = typia.random<string & tags.Format<"password">>();
  const hrefB = typia.random<string & tags.Format<"uri">>();
  const referrerB = typia.random<string & tags.Format<"uri">>();

  const userB = await api.functional.auth.user.join(connection, {
    body: {
      email: emailB,
      password: passwordB,
      href: hrefB,
      referrer: referrerB,
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(userB);

  // 3. Auth context is now B (join sets connection token). Attempt to update B's email to A's email.
  await TestValidator.error(
    "should reject update when setting email to one already in use",
    async () => {
      await api.functional.todoList.user.users.update(connection, {
        userId: userB.id,
        body: {
          email: userA.email,
        } satisfies ITodoListUser.IUpdate,
      });
    },
  );

  // 4. Re-authenticate as User A to confirm their record is unchanged.
  await api.functional.auth.user.join(connection, {
    body: {
      email: emailA,
      password: passwordA,
      href: hrefA,
      referrer: referrerA,
    } satisfies ITodoListUser.ICreate,
  }); // this acts as login (with same join endpoint)

  const resultA = await api.functional.todoList.user.users.update(connection, {
    userId: userA.id,
    body: {}, // no fields: acts as a no-op update to get result
  });
  typia.assert(resultA);
  TestValidator.equals(
    "User A email should remain unchanged",
    resultA.email,
    emailA,
  );
}
