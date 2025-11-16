import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";
import type { ITodoAppTodoUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUserJoin";

/**
 * Verify that todoUser self-registration rejects duplicate emails.
 *
 * Business rule:
 *
 * - /auth/todoUser/join must enforce uniqueness of
 *   ITodoAppTodoUserJoin.IRequest.email against the todo_app_todousers.email
 *   unique index.
 * - First registration with a fresh email should succeed and return a
 *   ITodoAppTodoUser.IAuthorized payload.
 * - A second registration attempt using the same email must fail with a
 *   business-level validation error (duplicate email), without creating any
 *   additional account and without exposing sensitive fields like
 *   password_hash.
 *
 * Scenario steps:
 *
 * 1. Build a valid registration payload `firstJoin` with a random email, a
 *    password string satisfying tags.Format<"password">, and realistic href and
 *    referrer URIs. Optionally include a display_name and ip.
 * 2. Call api.functional.auth.todoUser.join(connection, { body: firstJoin }) and
 *    assert that:
 *
 *    - The call succeeds without throwing.
 *    - The response conforms to ITodoAppTodoUser.IAuthorized (typia.assert).
 * 3. Build a second payload `secondJoin` that reuses the same email but may vary
 *    in display_name, href, referrer, or ip.
 * 4. Invoke api.functional.auth.todoUser.join again with `secondJoin` inside
 *    TestValidator.error, asserting that a runtime error is thrown (business
 *    rule violation for duplicate email). Do not inspect HTTP status codes or
 *    error messages, only that an error occurs.
 * 5. Optionally, perform a light sanity check that the first successful
 *    authorization payload remains structurally valid (typia.assert) and that
 *    token fields look non-empty, without attempting to validate any internal
 *    security details.
 */
export async function test_api_todo_user_join_duplicate_email_rejected(
  connection: api.IConnection,
) {
  // 1. Build first registration payload with unique email
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const firstJoin = {
    email,
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    ip: RandomGenerator.mobile(),
    href: "https://todo.example.com/signup" as string & tags.Format<"uri">,
    referrer: "https://todo.example.com/landing" as string & tags.Format<"uri">,
  } satisfies ITodoAppTodoUserJoin.IRequest;

  // 2. First join call must succeed and return authorized session
  const firstAuthorized: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, {
      body: firstJoin,
    });
  typia.assert<ITodoAppTodoUser.IAuthorized>(firstAuthorized);

  // 3. Build second payload with the same email but different metadata
  const secondJoin = {
    email,
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    ip: RandomGenerator.mobile(),
    href: "https://todo.example.com/signup?step=2" as string &
      tags.Format<"uri">,
    referrer: "https://todo.example.com/campaign" as string &
      tags.Format<"uri">,
  } satisfies ITodoAppTodoUserJoin.IRequest;

  // 4. Second join with duplicate email must fail with a business-level error
  await TestValidator.error(
    "duplicate email registration must be rejected",
    async () => {
      await api.functional.auth.todoUser.join(connection, {
        body: secondJoin,
      });
    },
  );

  // 5. Sanity check: first authorization payload still structurally valid and has non-empty tokens
  typia.assert<ITodoAppTodoUser.IAuthorized>(firstAuthorized);
  TestValidator.predicate(
    "access token should be non-empty",
    firstAuthorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should be non-empty",
    firstAuthorized.token.refresh.length > 0,
  );
}
