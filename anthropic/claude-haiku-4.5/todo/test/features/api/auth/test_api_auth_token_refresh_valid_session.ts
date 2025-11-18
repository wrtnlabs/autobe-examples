import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Tests successful JWT refresh for an authenticated user session.
 *
 * 1. Register a new user (unique email, valid password, session context).
 * 2. Obtain initial IAuthorized payload and tokens.
 * 3. Perform token refresh at /auth/user/refresh using the live session.
 * 4. Validate:
 *
 *    - New tokens are generated (values change, old ones replaced)
 *    - Tokens are not duplicated
 *    - Response matches ITodoListUser.IAuthorized contract
 *    - Session/user identity (id/email) remains unchanged
 *    - Token expiry and refreshable fields are meaningfully updated
 *    - Session audit fields (timestamps, etc.) are updated if included
 */
export async function test_api_auth_token_refresh_valid_session(
  connection: api.IConnection,
) {
  // 1. Register a new user with unique email/password
  const registerBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8> & tags.MaxLength<72>>(),
    href: "https://todolist.example.com/register",
    referrer: "https://todolist.example.com/landing",
    ip: null,
  } satisfies ITodoListUser.IJoin;
  const registration = await api.functional.auth.user.join(connection, {
    body: registerBody,
  });
  typia.assert(registration);

  // 2. Store the initial token values
  const oldToken = registration.token;

  // 3. Immediately attempt a token refresh with valid session
  const refreshed = await api.functional.auth.user.refresh(connection, {
    body: {} satisfies ITodoListUser.IRefresh,
  });
  typia.assert(refreshed);

  // 4. Assert:
  // a) Response matches type
  typia.assert<ITodoListUser.IAuthorized>(refreshed);

  // b) User identity must not change
  TestValidator.equals(
    "user id remains unchanged after refresh",
    refreshed.id,
    registration.id,
  );
  TestValidator.equals(
    "user email remains unchanged after refresh",
    refreshed.email,
    registration.email,
  );

  // c) Tokens are refreshed (both access and refresh change)
  TestValidator.notEquals(
    "access token must be refreshed",
    refreshed.token.access,
    oldToken.access,
  );
  TestValidator.notEquals(
    "refresh token must be refreshed",
    refreshed.token.refresh,
    oldToken.refresh,
  );

  // d) Expiry timestamps should be updated/extended not regress
  TestValidator.predicate(
    "access token expiry is extended (or at least not regressed)",
    new Date(refreshed.token.expired_at).getTime() >=
      new Date(oldToken.expired_at).getTime(),
  );
  TestValidator.predicate(
    "refresh token expiry is extended (or at least not regressed)",
    new Date(refreshed.token.refreshable_until).getTime() >=
      new Date(oldToken.refreshable_until).getTime(),
  );

  // e) Shape/type correctness
  typia.assert<IAuthorizationToken>(refreshed.token);
  typia.assert<string & tags.Format<"uuid">>(refreshed.id);
  typia.assert<string & tags.Format<"email">>(refreshed.email);
  typia.assert<string & tags.Format<"date-time">>(refreshed.created_at);
}
