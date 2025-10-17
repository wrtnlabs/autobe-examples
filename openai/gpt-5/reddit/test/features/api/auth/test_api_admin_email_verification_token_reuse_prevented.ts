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
 * Ensure admin email verification tokens are one-time use.
 *
 * Business flow:
 *
 * 1. Register a new admin (unverified).
 * 2. Resend verification email to issue a token (captured by test harness).
 * 3. Verify email with the token (expect success-like summary object).
 * 4. Call verify again with the same token (expect business error: token
 *    invalid/used).
 *
 * Notes:
 *
 * - We never inspect HTTP status codes (forbidden by policy) and rely on
 *   TestValidator.error to assert the second call fails.
 * - We never manipulate connection.headers; SDK handles auth tokens.
 * - If your environment captures tokens from an outbox, replace the generated
 *   token with the captured one to exercise a true success-then-fail sequence.
 */
export async function test_api_admin_email_verification_token_reuse_prevented(
  connection: api.IConnection,
) {
  // 1) Register a new admin user (unverified) via join
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const username: string = `${RandomGenerator.alphabets(1)}${RandomGenerator.alphaNumeric(11)}`; // 12 chars, [a-z][a-z0-9]
  const password: string = `A1${RandomGenerator.alphaNumeric(10)}`; // ensure >=8 chars, contains letter+digit
  const nowIso: string & tags.Format<"date-time"> =
    new Date().toISOString() as string & tags.Format<"date-time">;

  const joinBody = {
    email,
    username,
    password,
    terms_accepted_at: nowIso,
    privacy_accepted_at: nowIso,
    marketing_opt_in: true,
    marketing_opt_in_at: nowIso,
  } satisfies ICommunityPlatformAdminUserJoin.ICreate;

  const authorized: ICommunityPlatformAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, { body: joinBody });
  typia.assert(authorized);

  // 2) Resend a verification email to issue a token (outbox capture assumed by harness)
  const resendBody = {
    email,
  } satisfies ICommunityPlatformAdminUserEmailResend.ICreate;
  const resendSummary: ICommunityPlatformAdminUserVerification.ISummary =
    await api.functional.auth.adminUser.email.resend.resendVerification(
      connection,
      {
        body: resendBody,
      },
    );
  typia.assert(resendSummary);

  // In environments with an email outbox, retrieve the real token here.
  // For portability, generate a token-shaped string placeholder.
  const token: string = RandomGenerator.alphaNumeric(48);

  // 3) Verify email with the token (first-time)
  const verifyOnceBody = {
    verification_token: token,
  } satisfies ICommunityPlatformAdminUserEmailVerify.ICreate;
  const firstVerify: ICommunityPlatformAdminUserVerification.ISummary =
    await api.functional.auth.adminUser.email.verify.verifyEmail(connection, {
      body: verifyOnceBody,
    });
  typia.assert(firstVerify);

  // 4) Attempt to reuse the same token; must fail
  await TestValidator.error(
    "re-using the same verification token must be rejected",
    async () => {
      await api.functional.auth.adminUser.email.verify.verifyEmail(connection, {
        body: {
          verification_token: token,
        } satisfies ICommunityPlatformAdminUserEmailVerify.ICreate,
      });
    },
  );
}
