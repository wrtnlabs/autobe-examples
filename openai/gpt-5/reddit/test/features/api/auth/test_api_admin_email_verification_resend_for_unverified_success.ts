import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUser";
import type { ICommunityPlatformAdminUserEmailResend } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserEmailResend";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserVerification";
import type { IEAdminVerificationStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IEAdminVerificationStatus";

/**
 * Resend verification email for a newly registered (unverified) admin user.
 *
 * Business context:
 *
 * - Newly joined admin accounts are unverified by policy (email_verified=false),
 *   therefore a verification email resend should succeed immediately.
 * - The resend endpoint is public; it must succeed without Authorization.
 *
 * Test steps:
 *
 * 1. Register a brand-new admin via /auth/adminUser/join using a valid payload
 *    (email, username, password, consent timestamps).
 * 2. Create a fresh unauthenticated connection object so that the subsequent
 *    request does not carry Authorization headers added by join.
 * 3. Call POST /auth/adminUser/email/resend with the new admin's email.
 * 4. Validate response schema (ICommunityPlatformAdminUserVerification.ISummary)
 *    and assert business expectations: status === "sent" and ok === true.
 */
export async function test_api_admin_email_verification_resend_for_unverified_success(
  connection: api.IConnection,
) {
  // 1) Register a brand-new admin user
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphaNumeric(12), // 3-20 allowed; 12 fits pattern ^[A-Za-z0-9_]{3,20}$
    password: "Passw0rd123", // 8-64 with at least one letter and one number
    terms_accepted_at: new Date().toISOString(),
    privacy_accepted_at: new Date().toISOString(),
    marketing_opt_in: false,
  } satisfies ICommunityPlatformAdminUserJoin.ICreate;

  const adminAuthorized = await api.functional.auth.adminUser.join(connection, {
    body: joinBody,
  });
  typia.assert(adminAuthorized);

  // 2) Build an unauthenticated connection (public endpoint must not send Authorization)
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 3) Resend verification email by public endpoint using email identifier
  const resendBody = {
    email: joinBody.email,
  }; // ICommunityPlatformAdminUserEmailResend.ICreate is `any`; avoid `satisfies any` pattern

  const summary =
    await api.functional.auth.adminUser.email.resend.resendVerification(
      unauthConn,
      { body: resendBody },
    );
  typia.assert(summary);

  // 4) Business assertions
  TestValidator.equals(
    "resend status should be 'sent' for new unverified admin",
    summary.status,
    "sent",
  );
  TestValidator.predicate("resend ok flag should be true", summary.ok === true);
}
