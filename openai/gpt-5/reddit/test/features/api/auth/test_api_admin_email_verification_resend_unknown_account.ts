import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdminUserEmailResend } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserEmailResend";
import type { ICommunityPlatformAdminUserVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserVerification";
import type { IEAdminVerificationStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IEAdminVerificationStatus";

/**
 * Resend admin email verification for an unknown account (unauthenticated).
 *
 * This test ensures that the resend endpoint rejects requests when the target
 * administrator identity does not exist, without leaking enumeration details.
 *
 * Steps:
 *
 * 1. Create an unauthenticated connection by cloning the given connection with
 *    empty headers.
 * 2. Prepare a request body with an email identifier that is extremely unlikely to
 *    exist.
 * 3. Call POST /auth/adminUser/email/resend and assert that an error occurs using
 *    TestValidator.error.
 *
 * Notes:
 *
 * - We do not assert HTTP status codes or error payloads per framework policy; we
 *   only validate that an error is thrown.
 * - Request body uses satisfies ICommunityPlatformAdminUserEmailResend.ICreate to
 *   maintain DTO alignment.
 */
export async function test_api_admin_email_verification_resend_unknown_account(
  connection: api.IConnection,
) {
  // 1) Unauthenticated connection – allowed pattern: create new object with empty headers
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 2) Build a highly improbable, non-existent email
  const unknownEmail: string = `unknown-${RandomGenerator.alphaNumeric(16)}@example.com`;

  const body = {
    email: unknownEmail,
  } satisfies ICommunityPlatformAdminUserEmailResend.ICreate;

  // 3) Expect business error for unknown identity
  await TestValidator.error(
    "resend verification with unknown admin identity should fail",
    async () => {
      await api.functional.auth.adminUser.email.resend.resendVerification(
        unauthConn,
        { body },
      );
    },
  );
}
