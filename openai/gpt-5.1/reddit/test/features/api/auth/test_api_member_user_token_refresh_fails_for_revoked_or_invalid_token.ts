import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";

/**
 * Validate that memberUser token refresh rejects malformed or tampered refresh
 * tokens while still succeeding with a valid token.
 *
 * Business flow
 *
 * 1. Register a new member user through /auth/memberUser/join with realistic join
 *    payload.
 * 2. Immediately call /auth/memberUser/login using the same credentials to obtain
 *    a fresh ICommunityPlatformMemberuser.IAuthorized response and its refresh
 *    token.
 * 3. Use the valid refresh token to perform one successful
 *    /auth/memberUser/refresh call, asserting that a new
 *    ICommunityPlatformMemberuser.IAuthorized object is returned and type-valid
 *    via typia.assert. This establishes the happy path.
 * 4. Derive two invalid refresh_token variants while keeping TypeScript types
 *    valid:
 *
 *    - A purely random string that looks like a token but is not actually issued by
 *         the system.
 *    - A tampered token derived from the valid one by changing at least one
 *         character (e.g., flipping a character in the middle) so that it keeps
 *         token-like shape but should fail integrity checks.
 * 5. For each invalid variant, call /auth/memberUser/refresh with body satisfying
 *    ICommunityPlatformMemberuser.IRefreshRequest and wrap the call in
 *    TestValidator.error with a descriptive title to assert that the refresh
 *    attempt fails. Do not check specific HTTP status codes or error payloads –
 *    only that the operation does not succeed.
 * 6. Ensure that no tests rely on explicit session-revocation or audit-log
 *    endpoints (none are available) and that connection.headers is not accessed
 *    or modified directly – SDK handles Authorization headers.
 */
export async function test_api_member_user_token_refresh_fails_for_revoked_or_invalid_token(
  connection: api.IConnection,
) {
  // 1. Register a new member user
  const password = RandomGenerator.alphaNumeric(16);
  const email =
    `member+${RandomGenerator.alphaNumeric(8)}@example.com` as string &
      tags.Format<"email">;
  const username = `user_${RandomGenerator.alphaNumeric(8)}`;

  const joinBody = {
    username,
    email,
    password,
    ip: null,
    href: "https://example.com/join" as string & tags.Format<"uri">,
    referrer: "https://example.com/landing" as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const joined: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(joined);

  // 2. Login with the same credentials to obtain a fresh authorized envelope
  const loginBody = {
    identifier: email,
    password,
    ip: null,
    href: undefined,
    referrer: undefined,
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const loggedIn: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: loginBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(loggedIn);

  // Prefer refreshToken field if populated; otherwise fall back to token.refresh
  const baseRefreshToken: string | undefined =
    loggedIn.refreshToken ?? loggedIn.token.refresh;

  // Sanity check that we have some refresh token string
  await TestValidator.predicate(
    "refresh token must be non-empty string",
    async () => {
      return (
        typeof baseRefreshToken === "string" && baseRefreshToken.length > 0
      );
    },
  );

  const validRefreshToken: string = typia.assert<string>(baseRefreshToken!);

  // 3. Happy path: successful refresh with the valid token
  const validRefreshBody = {
    refresh_token: validRefreshToken,
  } satisfies ICommunityPlatformMemberuser.IRefreshRequest;

  const refreshed: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.refresh(connection, {
      body: validRefreshBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(refreshed);

  // 4. Construct invalid refresh_token variants
  const randomInvalidToken: string = RandomGenerator.alphaNumeric(64);

  // Tampered token: flip one character in the middle while keeping the string length
  const middleIndex = Math.floor(validRefreshToken.length / 2);
  const originalChar = validRefreshToken.charAt(middleIndex);
  const replacementChar = originalChar === "a" ? "b" : "a"; // simple deterministic flip between two chars
  const tamperedRefreshToken =
    validRefreshToken.substring(0, middleIndex) +
    replacementChar +
    validRefreshToken.substring(middleIndex + 1);

  const invalidTokens: string[] = [randomInvalidToken, tamperedRefreshToken];

  // 5. For each invalid token, assert that refresh fails
  for (const token of invalidTokens) {
    const invalidBody = {
      refresh_token: token,
    } satisfies ICommunityPlatformMemberuser.IRefreshRequest;

    await TestValidator.error(
      "memberUser refresh must fail for invalid or tampered refresh token",
      async () => {
        await api.functional.auth.memberUser.refresh(connection, {
          body: invalidBody,
        });
      },
    );
  }
}
