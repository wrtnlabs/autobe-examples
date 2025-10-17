import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPortalAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalAdmin";
import type { ICommunityPortalUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalUser";

export async function test_api_admin_verify_email_success(
  connection: api.IConnection,
) {
  /**
   * Happy-path test for admin email verification.
   *
   * 1. Create an admin account via POST /auth/admin/join
   * 2. Simulate a plausible verification token (UUID)
   * 3. Call POST /auth/admin/email/verify with token and optional user_id
   * 4. Assert success and, when provided, that returned user summary id matches
   *    created admin id.
   */

  // Prepare admin creation payload
  const adminBody = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd!",
    displayName: RandomGenerator.name(),
    isActive: true,
  } satisfies ICommunityPortalAdmin.ICreate;

  // Create admin account
  const authorized: ICommunityPortalAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminBody });
  typia.assert(authorized);

  // Simulate an email verification token (UUID). In real deployments the
  // token would be issued by the server and delivered via email; here we
  // generate a plausible token to exercise the verify endpoint in a
  // self-contained way.
  const token = typia.random<string & tags.Format<"uuid">>();

  // Call verify-email endpoint
  const verifyResp: ICommunityPortalAdmin.IVerifyEmailResponse =
    await api.functional.auth.admin.email.verify.verifyEmail(connection, {
      body: {
        token,
        user_id: authorized.id,
      } satisfies ICommunityPortalAdmin.IVerifyEmail,
    });
  typia.assert(verifyResp);

  // Business assertions
  TestValidator.predicate(
    "email verification succeeded",
    verifyResp.success === true,
  );

  if (verifyResp.user !== undefined && verifyResp.user !== null) {
    const verifiedUser = typia.assert<ICommunityPortalAdmin.ISummary>(
      verifyResp.user,
    );
    TestValidator.equals(
      "verified user id matches created admin id",
      verifiedUser.id,
      authorized.id,
    );
  }
}
