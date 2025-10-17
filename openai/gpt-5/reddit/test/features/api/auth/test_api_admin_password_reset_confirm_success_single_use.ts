import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUser";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserPasswordReset";
import type { ICommunityPlatformAdminUserPasswordResetConfirm } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserPasswordResetConfirm";
import type { ICommunityPlatformAdminUserPasswordResetRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserPasswordResetRequest";

/**
 * Confirm admin password reset once and verify one-time token semantics.
 *
 * Business flow:
 *
 * 1. Register a fresh admin via POST /auth/adminUser/join.
 * 2. Initiate password reset via POST /auth/adminUser/password/reset.
 * 3. Confirm password reset via POST /auth/adminUser/password/reset/confirm using
 *    a token and new password.
 * 4. Attempt to reuse the same token; expect an error (one-time token
 *    enforcement).
 *
 * Notes:
 *
 * - Public endpoints are invoked through a fresh connection with empty headers.
 * - Token retrieval is assumed to be handled by out-of-band mechanism; a token
 *   string is supplied to complete the flow for implementability.
 * - No HTTP status assertions; use TestValidator.error for the reuse failure
 *   case.
 */
export async function test_api_admin_password_reset_confirm_success_single_use(
  connection: api.IConnection,
) {
  // 1) Register a fresh admin
  const email = typia.random<string & tags.Format<"email">>();
  const username = RandomGenerator.alphaNumeric(12); // satisfies ^[A-Za-z0-9_]{3,20}$
  const initialPassword = `Aa1${RandomGenerator.alphaNumeric(9)}`; // >= 12 chars, letter+digit
  const joinBody = {
    email,
    username,
    password: initialPassword,
    terms_accepted_at: new Date().toISOString(),
    privacy_accepted_at: new Date().toISOString(),
  } satisfies ICommunityPlatformAdminUserJoin.ICreate;

  const admin: ICommunityPlatformAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, { body: joinBody });
  typia.assert(admin);

  // 2) Prepare a public (unauthenticated) connection for reset endpoints
  const publicConn: api.IConnection = { ...connection, headers: {} };

  // 3) Initiate password reset (identify by email)
  const resetInit =
    await api.functional.auth.adminUser.password.reset.requestPasswordReset(
      publicConn,
      {
        body: {
          email,
        } satisfies ICommunityPlatformAdminUserPasswordResetRequest.ICreate,
      },
    );
  typia.assert(resetInit);

  // 4) Confirm password reset successfully
  const reset_token = RandomGenerator.alphaNumeric(48); // assumed token acquired out-of-band
  const new_password = `Bb2${RandomGenerator.alphaNumeric(10)}`; // policy-compliant
  const confirm1 =
    await api.functional.auth.adminUser.password.reset.confirm.confirmPasswordReset(
      publicConn,
      {
        body: {
          reset_token,
          new_password,
        } satisfies ICommunityPlatformAdminUserPasswordResetConfirm.ICreate,
      },
    );
  typia.assert(confirm1);

  // 5) Attempt to reuse the same token; must fail by one-time token policy
  const another_password = `Cc3${RandomGenerator.alphaNumeric(10)}`;
  await TestValidator.error(
    "reusing the same reset token should fail",
    async () => {
      await api.functional.auth.adminUser.password.reset.confirm.confirmPasswordReset(
        publicConn,
        {
          body: {
            reset_token,
            new_password: another_password,
          } satisfies ICommunityPlatformAdminUserPasswordResetConfirm.ICreate,
        },
      );
    },
  );
}
