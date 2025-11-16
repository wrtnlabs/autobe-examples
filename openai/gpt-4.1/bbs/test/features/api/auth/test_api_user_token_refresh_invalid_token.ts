import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuthorizationToken";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

/**
 * Test error responses for invalid or expired refresh tokens for user token
 * refresh operation.
 *
 * Ensures test_api_user_token_refresh_invalid_token (function name as required)
 * performs:
 *
 * 1. Attempting to refresh the user token with a completely random string as
 *    refreshToken
 * 2. Attempting to refresh using a JWT-like but clearly expired token value
 *    (simulate structure, set arbitrary old exp value in payload, base64url
 *    encoded)
 * 3. Attempting to refresh using a JWT-like string with random/tampered payload
 *    structure
 *
 * For all cases, no tokens should be issued, a clear error should be thrown,
 * and business/security rules enforced (no type errors, only runtime errors).
 * The function must be exported as
 * 'test_api_user_token_refresh_invalid_token'.
 */
export async function test_api_user_token_refresh_invalid_token(
  connection: api.IConnection,
) {
  // Case 1: Totally random/invalid string as refreshToken
  await TestValidator.error(
    "refreshToken: random string is rejected",
    async () => {
      await api.functional.auth.user.refresh(connection, {
        body: {
          refreshToken: RandomGenerator.alphaNumeric(64),
        } satisfies IDiscussionBoardUser.IRefreshRequest,
      });
    },
  );
  // Case 2: JWT-like but obviously expired (structure only, not valid cryptographically)
  await TestValidator.error(
    "refreshToken: expired JWT-like string is rejected",
    async () => {
      // base64url encode: header.payload.signature
      const expiredPayload =
        typeof Buffer !== "undefined"
          ? Buffer.from(JSON.stringify({ exp: 1000 })).toString("base64url")
          : btoa(unescape(encodeURIComponent(JSON.stringify({ exp: 1000 }))))
              .replace(/\+/g, "-")
              .replace(/\//g, "_")
              .replace(/=+$/, "");
      const fakeJwt = [
        RandomGenerator.alphaNumeric(12),
        expiredPayload,
        RandomGenerator.alphaNumeric(32),
      ].join(".");
      await api.functional.auth.user.refresh(connection, {
        body: {
          refreshToken: fakeJwt,
        } satisfies IDiscussionBoardUser.IRefreshRequest,
      });
    },
  );
  // Case 3: Structurally valid JWT string but tampered random payload
  await TestValidator.error(
    "refreshToken: tampered JWT-like string is rejected",
    async () => {
      const randomPayload =
        typeof Buffer !== "undefined"
          ? Buffer.from(
              JSON.stringify({ foo: "bar", iat: Date.now() / 1000 }),
            ).toString("base64url")
          : btoa(
              unescape(
                encodeURIComponent(
                  JSON.stringify({ foo: "bar", iat: Date.now() / 1000 }),
                ),
              ),
            )
              .replace(/\+/g, "-")
              .replace(/\//g, "_")
              .replace(/=+$/, "");
      const tamperedJwt = [
        RandomGenerator.alphaNumeric(12),
        randomPayload,
        RandomGenerator.alphaNumeric(32),
      ].join(".");
      await api.functional.auth.user.refresh(connection, {
        body: {
          refreshToken: tamperedJwt,
        } satisfies IDiscussionBoardUser.IRefreshRequest,
      });
    },
  );
}
