import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";
import type { ITodoAppTodoUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUserJoin";

export async function test_api_todo_user_join_password_and_profile_validation(
  connection: api.IConnection,
) {
  /**
   * Validate todoUser self-registration and duplicate-email rejection.
   *
   * This test covers two main flows:
   *
   * 1. A successful registration with valid credentials and profile data.
   * 2. A failed registration attempting to reuse the same email, verifying
   *    business-level uniqueness constraints without relying on type errors.
   *
   * Steps:
   *
   * 1. Build a valid ITodoAppTodoUserJoin.IRequest payload (Case A) with
   *    well-formed email, password, optional display_name, and realistic href
   *    and referrer URIs. Call POST /auth/todoUser/join and assert that the
   *    response is a valid ITodoAppTodoUser.IAuthorized with a proper
   *    IAuthorizationToken and no credential leakage.
   * 2. Build a second payload (Case B) reusing the same email but with a different
   *    password and an overly long display_name. Call join inside
   *    TestValidator.error and ensure the operation fails due to the duplicate
   *    email business rule. We don’t depend on a specific HTTP status code.
   * 3. Finally, reassert that the original authorized user object from Case A is
   *    still structurally valid.
   */

  // -----------------------------
  // 1. Successful registration
  // -----------------------------

  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const href: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  const referrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  const joinRequestA = {
    email,
    password: RandomGenerator.alphaNumeric(16) as string &
      tags.Format<"password">,
    display_name: RandomGenerator.name(),
    href,
    referrer,
  } satisfies ITodoAppTodoUserJoin.IRequest;

  const authorizedA: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, {
      body: joinRequestA,
    });

  // Validate response type and basic business expectations
  typia.assert<ITodoAppTodoUser.IAuthorized>(authorizedA);

  // token must be structurally valid
  typia.assert<IAuthorizationToken>(authorizedA.token);

  // Basic business assertions on token strings being non-empty
  await TestValidator.predicate(
    "access token should be non-empty string",
    async () => authorizedA.token.access.length > 0,
  );
  await TestValidator.predicate(
    "refresh token should be non-empty string",
    async () => authorizedA.token.refresh.length > 0,
  );

  // Ensure sensitive fields like password/password_hash are not present
  const forbiddenKeys = ["password", "password_hash"] as const;
  const hasForbiddenTopLevelKey = Object.keys(authorizedA).some((key) =>
    forbiddenKeys.includes(key as (typeof forbiddenKeys)[number]),
  );
  TestValidator.predicate(
    "authorized payload must not expose credential hash or password fields",
    () => hasForbiddenTopLevelKey === false,
  );

  // -----------------------------
  // 2. Duplicate email registration must fail
  // -----------------------------

  const joinRequestB = {
    email, // same email as Case A to trigger unique constraint
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
    display_name: RandomGenerator.paragraph({
      sentences: 20,
      wordMin: 3,
      wordMax: 10,
    }),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppTodoUserJoin.IRequest;

  await TestValidator.error(
    "duplicate todoUser email join should fail",
    async () => {
      await api.functional.auth.todoUser.join(connection, {
        body: joinRequestB,
      });
    },
  );

  // -----------------------------
  // 3. Re-assert initial authorized user still valid
  // -----------------------------

  typia.assert<ITodoAppTodoUser.IAuthorized>(authorizedA);
}
