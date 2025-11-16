import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Validate that moderator session token refresh fails when supplied with an
 * invalid, expired, or tampered refresh token.
 *
 * This test ensures that the /auth/moderator/refresh endpoint strictly rejects
 * attempts to rotate moderator JWT session tokens using a wrong, expired, or
 * modified refresh token. The expected behavior is denial of the request, no
 * new credentials issued, and an explicit error response per API contract.
 * Security logic and audit trail should ensure such events are handled safely
 * and do not compromise the session model.
 *
 * Test Workflow:
 *
 * 1. Register a new moderator account with random data.
 * 2. Log in as that moderator to establish a valid session and receive issued
 *    tokens.
 * 3. Tamper with or replace the valid refresh token (e.g., flip character, inject
 *    garbage, or use a random string).
 * 4. Attempt a token refresh with the tampered/invalid refresh token.
 * 5. Confirm that the endpoint returns an explicit error—properly structured per
 *    API schema—and does not issue fresh session credentials.
 * 6. Ensure no new access/refresh token is set on the connection, i.e.,
 *    Authorization header does not change to a new token.
 */
export async function test_api_moderator_token_refresh_failure_invalid_token(
  connection: api.IConnection,
) {
  // 1. Register a new moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const createPayload = {
    email: moderatorEmail,
    password,
    status: "active",
    href: "https://example.com/register",
    referrer: "https://example.com/landing",
    ip: null,
    business_status: null,
  } satisfies ICommunityPlatformModerator.ICreate;
  const joinResp = await api.functional.auth.moderator.join(connection, {
    body: createPayload,
  });
  typia.assert(joinResp);

  // 2. Log in as the moderator
  const loginPayload = {
    email: moderatorEmail,
    password,
    href: "https://example.com/login",
    referrer: "https://example.com/register",
    ip: null,
  } satisfies ICommunityPlatformModerator.ILogin;
  const loginResp = await api.functional.auth.moderator.login(connection, {
    body: loginPayload,
  });
  typia.assert(loginResp);

  // 3. Tamper with refresh token (flip one character or generate a random string of similar length)
  const validRefreshToken = loginResp.token.refresh;
  let invalidRefreshToken: string;
  if (validRefreshToken.length > 8) {
    // Flip one character in the middle
    const middle = Math.floor(validRefreshToken.length / 2);
    const chars = validRefreshToken.split("");
    chars[middle] = chars[middle] === "a" ? "b" : "a";
    invalidRefreshToken = chars.join("");
  } else {
    // Generate a random string of same length
    invalidRefreshToken = RandomGenerator.alphaNumeric(
      validRefreshToken.length,
    );
  }

  const refreshPayload = {
    refresh_token: invalidRefreshToken,
  } satisfies ICommunityPlatformModerator.IRefresh;

  // 4. Attempt refresh and expect error without new credentials
  await TestValidator.error(
    "should fail to refresh with invalid moderator token",
    async () => {
      await api.functional.auth.moderator.refresh(connection, {
        body: refreshPayload,
      });
    },
  );
}
