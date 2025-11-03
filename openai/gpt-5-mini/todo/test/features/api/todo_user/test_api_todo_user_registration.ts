import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";

export async function test_api_todo_user_registration(
  connection: api.IConnection,
) {
  /**
   * Test: todoUser self-signup (happy path)
   *
   * Steps:
   *
   * 1. Build a valid ITodoAppTodoUser.ICreate request body
   * 2. Call POST /auth/todoUser/join
   * 3. Assert response is ITodoAppTodoUser.IAuthorized via typia.assert()
   * 4. Validate business expectations (email matches, tokens present,
   *    is_verified=false, timestamps present)
   */

  // 1) Prepare request body
  const email = `e2e.user+${RandomGenerator.alphaNumeric(6)}@example.com`;
  const createBody = {
    email,
    password: "P@ssw0rd!",
    displayName: RandomGenerator.name(),
    ip: null,
    href: "https://example.com/signup",
    referrer: "https://example.com/",
  } satisfies ITodoAppTodoUser.ICreate;

  // 2) Call the API
  const authorized: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, {
      body: createBody,
    });

  // 3) Type validation
  typia.assert(authorized);

  // 4) Business assertions
  TestValidator.equals(
    "returned email matches requested email",
    authorized.email,
    email,
  );

  // Token container assertions
  TestValidator.predicate(
    "access token is present and non-empty",
    typeof authorized.token?.access === "string" &&
      authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is present and non-empty",
    typeof authorized.token?.refresh === "string" &&
      authorized.token.refresh.length > 0,
  );

  // Lightweight JWT-like structure check (business-level heuristic, not type validation)
  TestValidator.predicate(
    "access token looks like JWT (contains two dots)",
    typeof authorized.token.access === "string" &&
      authorized.token.access.split(".").length === 3,
  );

  // Verify account initial state
  TestValidator.predicate(
    "account is not verified by default",
    authorized.is_verified === false,
  );

  // Timestamps presence
  TestValidator.predicate(
    "createdAt is present",
    authorized.createdAt !== null &&
      authorized.createdAt !== undefined &&
      authorized.createdAt.length > 0,
  );
  TestValidator.predicate(
    "updatedAt is present",
    authorized.updatedAt !== null &&
      authorized.updatedAt !== undefined &&
      authorized.updatedAt.length > 0,
  );

  // Save credentials for downstream tests (local variables)
  const createdUserId: string = authorized.id;
  const accessToken: string = authorized.token.access;
  const refreshToken: string = authorized.token.refresh;

  // Basic sanity checks (non-destructive)
  TestValidator.predicate(
    "user id is present",
    createdUserId !== null &&
      createdUserId !== undefined &&
      createdUserId.length > 0,
  );
  TestValidator.predicate("access token saved", accessToken.length > 0);
  TestValidator.predicate("refresh token saved", refreshToken.length > 0);
}
