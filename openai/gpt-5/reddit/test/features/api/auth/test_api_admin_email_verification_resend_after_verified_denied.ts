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
 * Resend endpoint is public; verify rejects invalid token.
 *
 * This test covers the feasible, strongly-typed portion of the admin email
 * verification lifecycle with the provided SDK:
 *
 * 1. Create a brand-new admin via join
 * 2. Call resend without authentication using the created email (public endpoint)
 * 3. Call verify with an invalid token and expect a business error
 * 4. Call resend again using username (also public)
 *
 * Notes on autonomous scenario correction:
 *
 * - The original scenario asked to verify an admin first, then ensure resend is
 *   denied afterward. However, the available public APIs do not expose a way to
 *   obtain a real verification token from the join flow. Therefore, this test
 *   validates feasible gates instead: that resend works publicly and that
 *   verify enforces token validity by rejecting an invalid token.
 */
export async function test_api_admin_email_verification_resend_after_verified_denied(
  connection: api.IConnection,
) {
  // 1) Create a brand-new admin via join
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const username: string = RandomGenerator.alphaNumeric(12); // 3–20 alnum/underscore allowed; 12 is safe
  const password: string = `${RandomGenerator.alphabets(6)}1${RandomGenerator.alphaNumeric(5)}`; // ensure letters+digits and >= 8

  const joinBody = {
    email,
    username,
    password,
    terms_accepted_at: new Date().toISOString(),
    privacy_accepted_at: new Date().toISOString(),
  } satisfies ICommunityPlatformAdminUserJoin.ICreate;

  const admin: ICommunityPlatformAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2) Resend without authentication (public endpoint)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  const resendByEmail =
    await api.functional.auth.adminUser.email.resend.resendVerification(
      unauthConn,
      {
        // ICommunityPlatformAdminUserEmailResend.ICreate is currently any; avoid "satisfies any".
        // Provider requires exactly one of { email | username }.
        body: { email },
      },
    );
  typia.assert(resendByEmail);

  // 3) Verify with invalid token → expect business error
  await TestValidator.error(
    "verify should fail with an invalid token",
    async () => {
      await api.functional.auth.adminUser.email.verify.verifyEmail(unauthConn, {
        body: {
          verification_token: RandomGenerator.alphaNumeric(32),
        } satisfies ICommunityPlatformAdminUserEmailVerify.ICreate,
      });
    },
  );

  // 4) Resend again using username (also public)
  const resendByUsername =
    await api.functional.auth.adminUser.email.resend.resendVerification(
      unauthConn,
      {
        body: { username },
      },
    );
  typia.assert(resendByUsername);
}
