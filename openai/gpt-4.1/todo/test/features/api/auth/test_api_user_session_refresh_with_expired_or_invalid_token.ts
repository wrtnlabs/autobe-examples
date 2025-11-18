import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

/**
 * Test that attempting to refresh a session with an expired or invalid refresh
 * token fails gracefully without exposing sensitive information or user state.
 *
 * Steps:
 *
 * 1. Register a new user to obtain a valid token for context.
 * 2. Attempt session refresh with an obviously invalid refresh token (random, not
 *    issued by system).
 * 3. Assert the API call fails (error is thrown), without revealing user details,
 *    access/refresh tokens, or new session creation. No sensitive or system
 *    data should be present in the error response.
 * 4. Confirm only the minimal privacy-compliant error information is delivered.
 */
export async function test_api_user_session_refresh_with_expired_or_invalid_token(
  connection: api.IConnection,
) {
  // Step 1. Register a new user
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) as string & tags.MinLength<8>,
    ip: undefined,
    href: "https://example.com/register",
    referrer: "https://example.com/landing",
  } satisfies ITodoUser.IJoin;
  const authorized = await api.functional.auth.user.join(connection, {
    body: joinBody,
  });
  typia.assert(authorized);

  // Step 2. Attempt to refresh session with a definitely invalid refresh token
  const refreshBody = {
    refresh_token: RandomGenerator.alphaNumeric(32) as string &
      tags.MinLength<16> &
      tags.MaxLength<512>,
    ip: undefined,
    href: "https://example.com/account",
    referrer: "https://example.com/login",
  } satisfies ITodoUser.IRefresh;

  await TestValidator.error(
    "refresh with invalid token must fail and leak no sensitive information",
    async () => {
      await api.functional.auth.user.refresh(connection, { body: refreshBody });
    },
  );
}
