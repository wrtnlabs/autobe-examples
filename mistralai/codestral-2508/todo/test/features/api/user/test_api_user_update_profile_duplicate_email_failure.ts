import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Verifies that updating a user's profile to use an email address already
 * registered to another account fails.
 *
 * 1. Register User A (will attempt duplicate email assignment).
 * 2. Register User B (unique email that will be used for the duplicate attempt).
 * 3. Switch authentication back to User A.
 * 4. Attempt to update User A's email to User B's email.
 * 5. Confirm that update fails due to duplicate email, verifying backend
 *    uniqueness enforcement.
 */
export async function test_api_user_update_profile_duplicate_email_failure(
  connection: api.IConnection,
) {
  // 1. Register User A
  const emailA: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const passwordA: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();
  const displayNameA = RandomGenerator.name();
  const hrefA: string & tags.Format<"uri"> = "https://testA.example.com/join";
  const referrerA: string & tags.Format<"uri"> = "https://refA.example.com/";
  const userAAuth: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: emailA,
        password: passwordA,
        href: hrefA,
        referrer: referrerA,
        display_name: displayNameA,
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(userAAuth);
  TestValidator.equals("registered email A", userAAuth.email, emailA);
  const userAId = userAAuth.id;

  // 2. Register User B
  const emailB: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const passwordB: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();
  const displayNameB = RandomGenerator.name();
  const hrefB: string & tags.Format<"uri"> = "https://testB.example.com/join";
  const referrerB: string & tags.Format<"uri"> = "https://refB.example.com/";
  const userBAuth: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: emailB,
        password: passwordB,
        href: hrefB,
        referrer: referrerB,
        display_name: displayNameB,
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(userBAuth);
  TestValidator.equals("registered email B", userBAuth.email, emailB);
  const userBId = userBAuth.id;

  // 3. Switch authentication context back to User A
  await api.functional.auth.user.join(connection, {
    body: {
      email: emailA,
      password: passwordA,
      href: hrefA,
      referrer: referrerA,
      display_name: displayNameA,
    } satisfies ITodoListUser.ICreate,
  });

  // 4. Attempt to update User A's email to User B's email (should fail)
  await TestValidator.error(
    "should fail to update email to a duplicate address",
    async () => {
      await api.functional.todoList.user.users.update(connection, {
        userId: userAId,
        body: {
          email: emailB,
        } satisfies ITodoListUser.IUpdate,
      });
    },
  );
}
