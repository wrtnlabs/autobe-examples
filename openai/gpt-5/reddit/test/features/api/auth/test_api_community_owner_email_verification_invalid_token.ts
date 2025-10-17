import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunityOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityOwner";

/**
 * Negative tests for community owner email verification with invalid tokens.
 *
 * This test ensures that POST /auth/communityOwner/email/verify rejects invalid
 * or malformed verification artifacts and does not issue authorization. It
 * focuses strictly on failure flows and avoids any type-level invalid requests
 * (the request body always conforms to
 * ICommunityPlatformCommunityOwner.IVerifyEmail).
 *
 * Steps:
 *
 * 1. Attempt verification with a random garbage token → expect error.
 * 2. Attempt verification with a token containing whitespace/specials → expect
 *    error.
 * 3. Attempt verification with a token that semantically looks "expired" → expect
 *    error.
 *
 * Notes:
 *
 * - We do not validate HTTP status codes or messages; only that an error occurs.
 * - We never manipulate connection.headers; SDK manages authentication headers.
 * - We do not send wrong-typed payloads nor omit required fields.
 */
export async function test_api_community_owner_email_verification_invalid_token(
  connection: api.IConnection,
) {
  // Variant 1: random garbage token
  const randomGarbageToken: string = RandomGenerator.alphaNumeric(48);

  await TestValidator.error(
    "verification fails with random garbage token",
    async () => {
      await api.functional.auth.communityOwner.email.verify.verifyEmail(
        connection,
        {
          body: {
            verification_token: randomGarbageToken,
          } satisfies ICommunityPlatformCommunityOwner.IVerifyEmail,
        },
      );
    },
  );

  // Variant 2: malformed token with whitespace and specials
  const malformedWithSpaces: string = `invalid ${RandomGenerator.alphaNumeric(8)} token!`;

  await TestValidator.error(
    "verification fails with whitespace/special-character token",
    async () => {
      await api.functional.auth.communityOwner.email.verify.verifyEmail(
        connection,
        {
          body: {
            verification_token: malformedWithSpaces,
          } satisfies ICommunityPlatformCommunityOwner.IVerifyEmail,
        },
      );
    },
  );

  // Variant 3: semantically "expired-like" token format
  const expiredLikeToken: string = `expired_${RandomGenerator.alphaNumeric(32)}`;

  await TestValidator.error(
    "verification fails with expired-like token",
    async () => {
      await api.functional.auth.communityOwner.email.verify.verifyEmail(
        connection,
        {
          body: {
            verification_token: expiredLikeToken,
          } satisfies ICommunityPlatformCommunityOwner.IVerifyEmail,
        },
      );
    },
  );
}
