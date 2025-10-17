import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdminUserEmailVerify } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserEmailVerify";
import type { ICommunityPlatformAdminUserVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserVerification";
import type { IEAdminVerificationStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IEAdminVerificationStatus";

/**
 * Deny invalid or expired admin email verification tokens.
 *
 * Purpose
 *
 * - Ensure POST /auth/adminUser/email/verify rejects an invalid/expired token
 *   with a business error and does not return a success summary.
 * - Repeating the same invalid token maintains rejection, implying no state
 *   mutation occurred.
 *
 * Steps
 *
 * 1. Construct a syntactically valid but semantically invalid token string.
 * 2. Call the verification endpoint and assert that an error is thrown.
 * 3. Repeat the call with the same token and assert it still fails.
 *
 * Notes
 *
 * - Do not assert HTTP status codes or error payload contents.
 * - No user state retrieval API is available; stability of rejection serves as
 *   proxy that no mutation occurred.
 */
export async function test_api_admin_email_verification_invalid_token_denied(
  connection: api.IConnection,
) {
  // 1) Prepare an obviously invalid token (still a valid string per DTO)
  const invalidToken: string = `invalid-${RandomGenerator.alphaNumeric(24)}`;
  const body = {
    verification_token: invalidToken,
  } satisfies ICommunityPlatformAdminUserEmailVerify.ICreate;

  // 2) Expect the endpoint to reject invalid/expired token
  await TestValidator.error(
    "reject invalid or expired admin email verification token",
    async () => {
      await api.functional.auth.adminUser.email.verify.verifyEmail(connection, {
        body,
      });
    },
  );

  // 3) Repeating with the same invalid token should remain rejected (stability)
  await TestValidator.error(
    "repeat invalid token remains rejected (no state mutation)",
    async () => {
      await api.functional.auth.adminUser.email.verify.verifyEmail(connection, {
        body,
      });
    },
  );
}
