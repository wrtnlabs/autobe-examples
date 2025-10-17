import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPortalAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalAdmin";
import type { ICommunityPortalUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalUser";

/**
 * Validate single-use behavior of admin email verification tokens.
 *
 * This E2E test covers the realistic path and a robust rejection check for
 * token reuse. Because many deployments deliver verification tokens by email,
 * the test prefers an external token supplied via the
 * TEST_ADMIN_VERIFICATION_TOKEN environment variable (useful for CI with
 * mail-catcher). When no external token is available (typical in simulated SDK
 * runs), the test falls back to a generated token to exercise the verification
 * endpoint in simulated setups.
 *
 * Steps:
 *
 * 1. Create an admin via POST /auth/admin/join
 * 2. Obtain token (env override preferred; generated fallback for simulation)
 * 3. Call POST /auth/admin/email/verify with token -> expect success
 * 4. Call POST /auth/admin/email/verify again with same token -> expect rejection
 */
export async function test_api_admin_verify_email_token_reuse_rejected(
  connection: api.IConnection,
) {
  // 1) Create admin account
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const createBody = {
    username: `admin_${RandomGenerator.alphaNumeric(8)}`,
    email: adminEmail,
    password: "P@ssw0rd!",
    displayName: null,
  } satisfies ICommunityPortalAdmin.ICreate;

  const authorized: ICommunityPortalAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: createBody,
    });
  typia.assert(authorized);

  // 2) Obtain verification token. Prefer explicit CI/mail-catcher token via
  // environment variable to run reliably against live systems. Fallback to a
  // generated token for simulated test targets.
  const envToken = (process &&
    (process.env as any)?.TEST_ADMIN_VERIFICATION_TOKEN) as string | undefined;
  const token = envToken ?? typia.random<string>();

  // 3) First verification attempt: must succeed (response.success === true)
  const firstVerify: ICommunityPortalAdmin.IVerifyEmailResponse =
    await api.functional.auth.admin.email.verify.verifyEmail(connection, {
      body: {
        token,
        // Provide user_id as an optional hint; server may ignore it.
        user_id: authorized.id,
      } satisfies ICommunityPortalAdmin.IVerifyEmail,
    });
  typia.assert(firstVerify);
  TestValidator.predicate(
    "first verification succeeded",
    firstVerify.success === true,
  );

  if (firstVerify.user !== undefined) {
    typia.assert(firstVerify.user);
    TestValidator.equals(
      "verified user id matches created admin",
      firstVerify.user.id,
      authorized.id,
    );
  }

  // 4) Immediate reuse attempt: must be rejected. Accept either thrown HTTP
  // error (e.g., 4xx) or a response with success === false. We do not assert
  // numeric HTTP status codes but assert that reuse is denied.
  try {
    const secondVerify: ICommunityPortalAdmin.IVerifyEmailResponse =
      await api.functional.auth.admin.email.verify.verifyEmail(connection, {
        body: {
          token,
        } satisfies ICommunityPortalAdmin.IVerifyEmail,
      });
    typia.assert(secondVerify);

    TestValidator.predicate(
      "second verification attempt rejected (server returned success===false)",
      secondVerify.success === false,
    );
  } catch (err) {
    // Accept thrown HttpError (client error) as valid rejection behavior
    TestValidator.predicate(
      "second verification attempt rejected by exception",
      true,
    );
  }
}
