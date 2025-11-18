import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Tests the successful JWT token refresh operation for a valid Todo List user
 * session.
 *
 * This flow sends a request to /auth/user/refresh with a plausible,
 * minimum-length refresh token string. It expects the backend to issue new JWT
 * access & refresh tokens and to return a fully-typed IAuthorized object. The
 * test asserts full type compliance, verifies presence of both token/access and
 * refresh, ensures all expiry metadata fields are valid ISO dates, and confirms
 * the token/user payload structure is returned as per spec.
 *
 * No error, negative, or type-violation scenarios are checked in this test; it
 * is a nominal-path E2E validation only.
 */
export async function test_api_user_token_refresh_success(
  connection: api.IConnection,
) {
  // Step 1: Prepare a plausible refresh token (min length 32 characters as per ITodoListUser.IRefresh)
  const refreshToken: string & tags.MinLength<32> =
    RandomGenerator.alphaNumeric(36) as string & tags.MinLength<32>;
  const requestBody = {
    refresh_token: refreshToken,
  } satisfies ITodoListUser.IRefresh;

  // Step 2: Call the API
  const response: ITodoListUser.IAuthorized =
    await api.functional.auth.user.refresh(connection, { body: requestBody });
  typia.assert(response);

  // Step 3: Basic presence checks and deep field assertions
  TestValidator.predicate(
    "response.id is a UUID",
    typeof response.id === "string" && response.id.length > 0,
  );
  TestValidator.predicate(
    "response.email is a valid string",
    typeof response.email === "string" && response.email.length > 0,
  );
  TestValidator.predicate(
    "response token.access present",
    typeof response.token.access === "string" &&
      response.token.access.length > 0,
  );
  TestValidator.predicate(
    "response token.refresh present",
    typeof response.token.refresh === "string" &&
      response.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token.expired_at is ISO string",
    typeof response.token.expired_at === "string" &&
      !isNaN(Date.parse(response.token.expired_at)),
  );
  TestValidator.predicate(
    "token.refreshable_until is ISO string",
    typeof response.token.refreshable_until === "string" &&
      !isNaN(Date.parse(response.token.refreshable_until)),
  );
  TestValidator.predicate("user is not locked", response.is_locked === false);

  if (response.user !== undefined) {
    typia.assert(response.user);
    TestValidator.equals(
      "nested user id matches",
      response.user.id,
      response.id,
    );
    TestValidator.equals(
      "nested user email matches",
      response.user.email,
      response.email,
    );
    TestValidator.equals(
      "nested user locked matches",
      response.user.is_locked,
      response.is_locked,
    );
  }
}
