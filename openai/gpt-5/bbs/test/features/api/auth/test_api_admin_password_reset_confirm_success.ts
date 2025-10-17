import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconDiscussAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussAdmin";

/**
 * Confirm admin password reset with a valid token and a strong new password.
 *
 * Business flow:
 *
 * 1. Create a fresh admin via POST /auth/admin/join.
 * 2. Initiate password reset via POST /auth/admin/password/reset/request using the
 *    admin email.
 * 3. Complete password reset via POST /auth/admin/password/reset/confirm with a
 *    token and new password.
 *
 * Notes:
 *
 * - Request/confirm endpoints are unauthenticated; use a fresh connection with
 *   empty headers.
 * - Real token capture is not available via provided APIs. Therefore, full
 *   confirmation is executed only in simulator mode.
 * - Responses are validated strictly with typia.assert; no additional type checks
 *   are necessary.
 */
export async function test_api_admin_password_reset_confirm_success(
  connection: api.IConnection,
) {
  // 1) Register a new admin (authenticated context established by SDK automatically)
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const initialPassword: string = RandomGenerator.alphaNumeric(12);
  const joinBody = {
    email,
    password: initialPassword, // MinLength<8>
    display_name: RandomGenerator.name(1),
    timezone: "Asia/Seoul",
    locale: "en-US",
  } satisfies IEconDiscussAdmin.ICreate;
  const authorized: IEconDiscussAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: joinBody });
  typia.assert(authorized);

  // 2) Build an unauthenticated connection for reset flows
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 3) Initiate password reset by email (generic acknowledgement; no token disclosure)
  const requestBody = {
    email,
  } satisfies IEconDiscussAdmin.IPasswordResetRequest;
  const requestEvent: IEconDiscussAdmin.ISecurityEvent =
    await api.functional.auth.admin.password.reset.request.requestPasswordReset(
      unauthConn,
      { body: requestBody },
    );
  typia.assert(requestEvent);

  // 4) Complete reset only in simulator (no real token retrieval API available)
  if (connection.simulate === true) {
    const newPassword: string = RandomGenerator.alphaNumeric(16); // strong enough, MinLength<8>
    const syntheticToken: string = RandomGenerator.alphaNumeric(40);

    const confirmBody = {
      token: syntheticToken,
      new_password: newPassword,
    } satisfies IEconDiscussAdmin.IPasswordResetConfirm;

    const confirmEvent: IEconDiscussAdmin.ISecurityEvent =
      await api.functional.auth.admin.password.reset.confirm.confirmPasswordReset(
        unauthConn,
        { body: confirmBody },
      );
    typia.assert(confirmEvent);

    // Basic business assertions (no type re-validation beyond typia.assert)
    TestValidator.predicate(
      "confirmation returned a security event object",
      () => typeof confirmEvent.outcome === "string",
    );
  }
}
