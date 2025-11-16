import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuestUser";

/**
 * Ensure guest refresh rejects tampered or malformed refresh tokens.
 *
 * Business intent:
 *
 * - A guest user first joins via /auth/guestUser/join and receives JWT tokens
 *   (access + refresh) encapsulated in
 *   IDiscussionBoardGuestUser.IAuthorized.token.
 * - The refresh endpoint /auth/guestUser/refresh must reject any refresh attempt
 *   where the refreshToken string has been altered or is structurally invalid,
 *   even though it is still a well-typed string.
 * - E2E tests should validate that such invalid inputs cause the call to fail
 *   (throw), without issuing a new IAuthorizationToken.
 *
 * Test steps:
 *
 * 1. Join as a guest user to obtain a valid refresh token.
 * 2. Derive multiple invalid refresh token variants:
 *
 *    - "tamperedMiddle": flip or replace a character in the middle of the valid
 *         refresh token while keeping it the same length.
 *    - "truncated": drop the last several characters of the valid refresh token to
 *         break its structure.
 *    - "random": generate a completely unrelated opaque token string using
 *         RandomGenerator.alphaNumeric.
 * 3. For each invalid token variant, build an IDiscussionBoardGuestUser.IRefresh
 *    body with required href/referrer fields set to valid URI strings and an
 *    optional ip field set to null (to exercise nullable handling).
 * 4. Call api.functional.auth.guestUser.refresh for each invalid token and assert
 *    that it throws using TestValidator.error. Do not inspect HttpError.status
 *    values or error messages – only that an error occurs.
 * 5. The test passes if every invalid token causes refresh to fail; if any variant
 *    unexpectedly succeeds, the test must fail.
 */
export async function test_api_guest_user_refresh_rejects_expired_or_tampered_token(
  connection: api.IConnection,
) {
  // 1. Join as a guest user to get an authorized payload with refresh token.
  const joinInput = {
    anonymous_token: RandomGenerator.alphaNumeric(32),
    ip: null,
    href: "https://example.com/join" as string & tags.Format<"uri">,
    referrer: "https://example.com/landing" as string & tags.Format<"uri">,
  } satisfies IDiscussionBoardGuestUser.IJoin;

  const authorized = await api.functional.auth.guestUser.join(connection, {
    body: joinInput,
  });
  typia.assert<IDiscussionBoardGuestUser.IAuthorized>(authorized);

  const baseRefreshToken: string = authorized.token.refresh;

  // Helper to safely tamper a token string.
  const makeTamperedMiddle = (token: string): string => {
    if (token.length <= 4) return token + "x"; // degenerate but still tampered
    const mid = Math.floor(token.length / 2);
    const replacementPool = [
      "A",
      "B",
      "C",
      "x",
      "y",
      "z",
      "0",
      "1",
      "2",
    ] as const;
    const replacement = RandomGenerator.pick(replacementPool);
    return token.slice(0, mid) + replacement + token.slice(mid + 1);
  };

  const makeTruncated = (token: string): string => {
    if (token.length <= 8) return token.slice(0, Math.max(1, token.length - 1));
    return token.slice(0, token.length - 5);
  };

  const invalidTokens: string[] = [
    makeTamperedMiddle(baseRefreshToken),
    makeTruncated(baseRefreshToken),
    RandomGenerator.alphaNumeric(64),
  ];

  // 3 & 4. For each invalid token, attempt refresh and assert it fails.
  for (const invalid of invalidTokens) {
    const refreshBody = {
      refreshToken: invalid,
      ip: null,
      href: "https://example.com/refresh" as string & tags.Format<"uri">,
      referrer: "https://example.com/context" as string & tags.Format<"uri">,
    } satisfies IDiscussionBoardGuestUser.IRefresh;

    await TestValidator.error(
      "guest refresh must reject invalid token",
      async () => {
        await api.functional.auth.guestUser.refresh(connection, {
          body: refreshBody,
        });
      },
    );
  }
}
