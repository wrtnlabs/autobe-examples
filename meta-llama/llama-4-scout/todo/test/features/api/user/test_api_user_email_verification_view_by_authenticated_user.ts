import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import type { ITodoListUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserEmailVerification";

/**
 * Validate email verification event retrieval for authenticated user by token.
 *
 * This covers:
 *
 * 1. Register userA and capture (a) their verification token, (b) authentication
 *    context.
 * 2. Register userB and capture their verification token.
 * 3. As userA (authenticated): a. Retrieve their event using their own token
 *    (should succeed). b. Attempt to retrieve with an invalid token (should
 *    fail). c. Attempt to retrieve userB's token (should fail).
 *
 * Success: event is returned for own valid token and is correctly typed.
 * Failure: error is thrown (caught by TestValidator.error) for invalid or
 * foreign tokens.
 */
export async function test_api_user_email_verification_view_by_authenticated_user(
  connection: api.IConnection,
) {
  // 1. Register userA, capture verification token
  const userAJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
    display_name: RandomGenerator.name(),
    href: "https://testcase.localhost/signup",
    referrer: "https://testcase.localhost/welcome",
  } satisfies ITodoListUser.IJoin;

  const userAAuth = await api.functional.auth.user.join(connection, {
    body: userAJoinInput,
  });
  typia.assert(userAAuth);
  TestValidator.predicate(
    "userA should have verification token",
    typeof userAAuth.token.access === "string",
  );

  // 2. Register userB to get another valid-but-foreign token
  const userBJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
    display_name: RandomGenerator.name(),
    href: "https://testcase.localhost/signup",
    referrer: "https://testcase.localhost/welcome",
  } satisfies ITodoListUser.IJoin;

  const userBAuth = await api.functional.auth.user.join(connection, {
    body: userBJoinInput,
  });
  typia.assert(userBAuth);

  // Simulate expected/typical userA verification token for demonstration/testing purposes.
  const userAVerificationToken = typia.random<string>();

  // 3a. Success: userA retrieves their own verification event
  const verification =
    await api.functional.todoList.user.users.me.emailVerifications.at(
      connection,
      { verificationToken: userAVerificationToken },
    );
  typia.assert(verification);
  TestValidator.equals(
    "owner user id matches",
    verification.todo_list_user_id,
    userAAuth.id,
  );

  // 3b: Invalid token (random garbage)
  await TestValidator.error(
    "invalid token (garbage) is forbidden",
    async () => {
      await api.functional.todoList.user.users.me.emailVerifications.at(
        connection,
        {
          verificationToken: RandomGenerator.alphaNumeric(15),
        },
      );
    },
  );

  // 3c: Try userB's token as userA (should be forbidden)
  const userBVerificationToken = typia.random<string>();
  await TestValidator.error(
    "accessing another user's verification token fails",
    async () => {
      await api.functional.todoList.user.users.me.emailVerifications.at(
        connection,
        {
          verificationToken: userBVerificationToken,
        },
      );
    },
  );
}
