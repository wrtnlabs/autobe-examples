import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";

/**
 * Validate that memberUser refresh rejects expired or invalid tokens.
 *
 * Business goals:
 *
 * - Ensure that POST /auth/memberUser/refresh treats tampered or superseded
 *   refresh tokens as authentication failures.
 * - Confirm that invalid refresh attempts do not create new sessions or
 *   authorization token bundles.
 * - Prove that a currently valid refresh token still works after invalid
 *   attempts, tying failures to token validity rather than account bans.
 *
 * Test flow:
 *
 * 1. Register a new memberUser via join to obtain an initial
 *    ICommunityPlatformMemberuser.IAuthorized with its IAuthorizationToken.
 * 2. Perform one successful refresh to rotate tokens; capture both the original
 *    and rotated refresh token strings.
 * 3. Build an obviously tampered token by flipping one character in the rotated
 *    refresh token.
 * 4. Attempt refresh with the tampered token and assert that it throws an error
 *    using TestValidator.error.
 * 5. Attempt refresh with the original, now-superseded refresh token and assert
 *    that it throws an error as well (authentication failure).
 * 6. Finally, refresh again with the latest valid refresh token and verify success
 *    via typia.assert and basic token evolution checks (e.g., new token.access
 *    different from previous access token).
 */
export async function test_api_memberuser_refresh_with_expired_or_invalid_token(
  connection: api.IConnection,
) {
  // 1. Register a new memberUser and obtain initial authorized payload
  const joinBody = {
    username: RandomGenerator.alphabets(8),
    email: `user+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://client.example.com/join",
    referrer: "https://client.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const joined: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(joined);

  const initialToken: IAuthorizationToken = joined.token;

  // 2. Perform one successful refresh to rotate tokens
  const firstRefreshBody = {
    refreshToken: initialToken.refresh,
    ip: null,
    href: "https://client.example.com/refresh",
    referrer: "https://client.example.com/app",
  } satisfies ICommunityPlatformMemberuser.IRefresh;

  const refreshedOnce: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.refresh(connection, {
      body: firstRefreshBody,
    });
  typia.assert(refreshedOnce);

  const rotatedToken: IAuthorizationToken = refreshedOnce.token;

  // 3. Construct a tampered refresh token from the rotated token
  const originalRefreshString = rotatedToken.refresh;
  const chars = [...originalRefreshString];
  const indexToFlip = chars.length > 0 ? 0 : -1;
  if (indexToFlip >= 0) {
    const originalChar = chars[indexToFlip];
    const flipCandidates = [
      "A",
      "B",
      "C",
      "D",
      "E",
      "F",
      "G",
      "H",
      "I",
      "J",
      "K",
      "L",
      "M",
      "N",
      "O",
      "P",
      "Q",
      "R",
      "S",
      "T",
      "U",
      "V",
      "W",
      "X",
      "Y",
      "Z",
      "0",
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
    ] as const;
    const alternative = flipCandidates.find((c) => c !== originalChar) ?? "X";
    chars[indexToFlip] = alternative;
  }
  const tamperedRefreshToken = chars.join("");

  // 4. Attempt refresh with tampered token (should fail)
  const tamperedBody = {
    refreshToken: tamperedRefreshToken,
    ip: null,
    href: "https://client.example.com/refresh/tampered",
    referrer: "https://client.example.com/app",
  } satisfies ICommunityPlatformMemberuser.IRefresh;

  await TestValidator.error("tampered refresh token must fail", async () => {
    await api.functional.auth.memberUser.refresh(connection, {
      body: tamperedBody,
    });
  });

  // 5. Attempt refresh with original, now-superseded refresh token (may fail)
  const oldTokenBody = {
    refreshToken: initialToken.refresh,
    ip: null,
    href: "https://client.example.com/refresh/old",
    referrer: "https://client.example.com/app",
  } satisfies ICommunityPlatformMemberuser.IRefresh;

  await TestValidator.error(
    "superseded original refresh token must fail",
    async () => {
      await api.functional.auth.memberUser.refresh(connection, {
        body: oldTokenBody,
      });
    },
  );

  // 6. Verify that the latest valid refresh token still works
  const secondRefreshBody = {
    refreshToken: rotatedToken.refresh,
    ip: null,
    href: "https://client.example.com/refresh/final",
    referrer: "https://client.example.com/app",
  } satisfies ICommunityPlatformMemberuser.IRefresh;

  const refreshedTwice: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.refresh(connection, {
      body: secondRefreshBody,
    });
  typia.assert(refreshedTwice);

  TestValidator.notEquals(
    "access token should rotate on successful refresh",
    refreshedTwice.token.access,
    rotatedToken.access,
  );
}
