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
 * Validate that admin password reset confirmation fails with an invalid or
 * expired token.
 *
 * Business context:
 *
 * - An administrator requests a password reset. The system issues a one-time
 *   token out-of-band.
 * - If a client attempts to confirm the reset with an invalid/expired token, the
 *   operation must fail.
 *
 * Test workflow:
 *
 * 1. Register a fresh admin via POST /auth/adminUser/join using a compliant
 *    password and consent timestamps.
 * 2. Initiate a password reset via POST /auth/adminUser/password/reset identifying
 *    the user by email.
 * 3. Attempt POST /auth/adminUser/password/reset/confirm with an obviously invalid
 *    token and a compliant new password.
 *
 *    - Expect business error; do not assert specific status codes or error messages.
 *
 * Notes:
 *
 * - No read API is provided to verify password_hash/account_state/updated_at side
 *   effects, so this test restricts validation to ensuring the confirm endpoint
 *   rejects invalid tokens.
 */
export async function test_api_admin_password_reset_confirm_invalid_token(
  connection: api.IConnection,
) {
  // 1) Register a fresh admin
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const username: string = RandomGenerator.alphabets(10); // ^[A-Za-z0-9_]{3,20}$ satisfied by lowercase letters
  const joinBody = {
    email,
    username,
    password: "AdminPass123", // 8–64 chars, contains letters and digits
    terms_accepted_at: new Date().toISOString(),
    privacy_accepted_at: new Date().toISOString(),
  } satisfies ICommunityPlatformAdminUserJoin.ICreate;
  const authorized: ICommunityPlatformAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, { body: joinBody });
  typia.assert(authorized);

  // 2) Initiate password reset (identify by email)
  const resetRequestBody = {
    email,
  } satisfies ICommunityPlatformAdminUserPasswordResetRequest.ICreate;
  const resetSummary: ICommunityPlatformAdminUserPasswordReset.ISummary =
    await api.functional.auth.adminUser.password.reset.requestPasswordReset(
      connection,
      { body: resetRequestBody },
    );
  typia.assert(resetSummary);

  // 3) Attempt to confirm with an invalid/expired token and expect error
  const confirmBodyInvalid = {
    reset_token: RandomGenerator.alphaNumeric(32),
    new_password: "ValidPass1234",
  } satisfies ICommunityPlatformAdminUserPasswordResetConfirm.ICreate;
  await TestValidator.error(
    "confirming admin password reset with invalid token must fail",
    async () => {
      await api.functional.auth.adminUser.password.reset.confirm.confirmPasswordReset(
        connection,
        { body: confirmBodyInvalid },
      );
    },
  );
}
