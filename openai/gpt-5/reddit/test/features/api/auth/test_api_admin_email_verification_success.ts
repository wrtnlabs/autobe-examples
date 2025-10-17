import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUser";
import type { ICommunityPlatformAdminUserEmailResend } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserEmailResend";
import type { ICommunityPlatformAdminUserEmailVerify } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserEmailVerify";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserVerification";
import type { IEAdminVerificationStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IEAdminVerificationStatus";

/**
 * Verify an admin user's email using resend + simulated verification token.
 *
 * Business flow (feasible version):
 *
 * 1. Register a new admin with unique identifiers (email, username) and required
 *    consents using ICommunityPlatformAdminUserJoin.ICreate.
 * 2. Request resend of the verification email for the registered admin using POST
 *    /auth/adminUser/email/resend. We pass an identifying object with the email
 *    (note: its DTO is typed as `any` so we must not use `satisfies any`).
 *    Assert the summary payload type and that status is a recognized enum
 *    value.
 * 3. Call POST /auth/adminUser/email/verify on a simulated connection with a
 *    synthetically generated verification_token that conforms to
 *    ICommunityPlatformAdminUserEmailVerify.ICreate. Assert the summary payload
 *    type and perform basic business validations (non-empty message, enum
 *    status).
 *
 * Notes:
 *
 * - We do not manipulate connection.headers; the SDK manages auth tokens.
 * - We avoid type-error tests and HTTP status code assertions.
 * - We only use `satisfies` on concrete DTOs (never on `any`).
 */
export async function test_api_admin_email_verification_success(
  connection: api.IConnection,
) {
  // 1) Register a new admin (tokens issued; SDK manages Authorization)
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const username: string = `admin_${RandomGenerator.alphaNumeric(12)}`; // 18 chars, matches ^[A-Za-z0-9_]{3,20}$
  const password: string = `A1${RandomGenerator.alphaNumeric(8)}_${RandomGenerator.alphaNumeric(4)}`; // >= 8, contains letters & digits

  const joinBody = {
    email,
    username,
    password,
    terms_accepted_at: new Date().toISOString(),
    privacy_accepted_at: new Date().toISOString(),
  } satisfies ICommunityPlatformAdminUserJoin.ICreate;

  const authorized: ICommunityPlatformAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // 2) Resend the verification email to generate/refresh a token (no satisfies on `any`)
  const resendSummary: ICommunityPlatformAdminUserVerification.ISummary =
    await api.functional.auth.adminUser.email.resend.resendVerification(
      connection,
      {
        body: { email }, // ICommunityPlatformAdminUserEmailResend.ICreate is `any`, pass plain object
      },
    );
  typia.assert(resendSummary);

  const allStatuses = [
    "verified",
    "already_verified",
    "sent",
  ] as const satisfies readonly IEAdminVerificationStatus[];
  TestValidator.predicate(
    "resend status must be a valid IEAdminVerificationStatus",
    allStatuses.includes(resendSummary.status),
  );

  // 3) Verify email using a simulated connection with a synthetic token
  const simulatedConn: api.IConnection = { ...connection, simulate: true };
  const verifyBody = {
    verification_token: RandomGenerator.alphaNumeric(32),
  } satisfies ICommunityPlatformAdminUserEmailVerify.ICreate;

  const verifySummary: ICommunityPlatformAdminUserVerification.ISummary =
    await api.functional.auth.adminUser.email.verify.verifyEmail(
      simulatedConn,
      { body: verifyBody },
    );
  typia.assert(verifySummary);

  TestValidator.predicate(
    "verify status must be a valid IEAdminVerificationStatus",
    allStatuses.includes(verifySummary.status),
  );
  TestValidator.notEquals(
    "verification message must not be empty",
    verifySummary.message.length,
    0,
  );
}
