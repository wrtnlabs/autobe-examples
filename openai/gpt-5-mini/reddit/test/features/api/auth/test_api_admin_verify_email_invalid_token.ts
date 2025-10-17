import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPortalAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalAdmin";
import type { ICommunityPortalUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalUser";

/**
 * Validate admin email verification rejects invalid tokens.
 *
 * Business context:
 *
 * - Email verification tokens are single-use and time-limited. The server must
 *   not accept malformed, expired, or otherwise invalid tokens. This test
 *   exercises the negative path to ensure verification cannot be performed with
 *   an invalid token.
 *
 * Steps:
 *
 * 1. Optionally create an admin account via POST /auth/admin/join to ensure an
 *    account context exists (not required for the invalid-token rejection but
 *    useful for exercising the creation workflow).
 * 2. Call POST /auth/admin/email/verify with a known-invalid token value.
 * 3. Validate that the API either throws (non-2xx) or returns a
 *    IVerifyEmailResponse with success === false.
 */
export async function test_api_admin_verify_email_invalid_token(
  connection: api.IConnection,
) {
  // 1) Create an admin to provide context. This step uses valid types only.
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminRequest = {
    username: RandomGenerator.alphaNumeric(8),
    email: adminEmail,
    password: "P@ssw0rd!23",
    displayName: RandomGenerator.name(),
  } satisfies ICommunityPortalAdmin.ICreate;

  const authorized: ICommunityPortalAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminRequest,
    });
  typia.assert(authorized);

  // 2) Attempt to verify email with an explicitly invalid token.
  const invalidTokenRequest = {
    token: "invalid-token-value",
  } satisfies ICommunityPortalAdmin.IVerifyEmail;

  // Try calling the endpoint and handle both possible behaviors:
  // - the server may throw a non-2xx HTTP error
  // - or the server may return 200 with { success: false }
  try {
    const response: ICommunityPortalAdmin.IVerifyEmailResponse =
      await api.functional.auth.admin.email.verify.verifyEmail(connection, {
        body: invalidTokenRequest,
      });
    // If we got a response, assert its shape and that success is false.
    typia.assert(response);
    TestValidator.equals(
      "invalid token must not verify (response.success === false)",
      response.success,
      false,
    );
  } catch (exp) {
    // If the call throws, ensure the call indeed fails. Use TestValidator.error
    // with an async callback to ensure proper async error handling.
    await TestValidator.error(
      "invalid token must be rejected (throws non-2xx)",
      async () => {
        // Re-run the call inside the validator's callback so it catches the throw
        await api.functional.auth.admin.email.verify.verifyEmail(connection, {
          body: invalidTokenRequest,
        });
      },
    );
  }
}
