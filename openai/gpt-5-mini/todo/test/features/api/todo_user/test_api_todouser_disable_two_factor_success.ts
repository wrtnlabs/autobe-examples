import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";

export async function test_api_todouser_disable_two_factor_success(
  connection: api.IConnection,
) {
  /**
   * Purpose:
   *
   * - Create a new todoUser via join
   * - Enable MFA (provision) for that user
   * - Disable MFA using step-up verification (current password)
   *
   * Notes:
   *
   * - The SDK does not provide a GET profile function in the provided materials,
   *   so final verification is performed using returned DTO invariants (IDs)
   *   and the initial IAuthorized.mfa_enabled flag reported at join time.
   */

  // --- Test data (unique) ---
  const password = RandomGenerator.alphaNumeric(12); // satisfy min length 8
  const email = `${Date.now()}_${RandomGenerator.alphaNumeric(8)}@example.com`;
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();

  // --- 1) Join (register) ---
  const auth: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, {
      body: {
        email,
        password,
        href,
        referrer,
      } satisfies ITodoAppTodoUser.ICreate,
    });
  typia.assert(auth);

  // The newly created account should not have MFA enabled by default
  TestValidator.predicate(
    "mfa disabled by default",
    auth.mfa_enabled === false,
  );

  // --- 2) Enable MFA (provisioning) ---
  // Use requireVerification=false to allow provisioning flow without a
  // separate verification step if server supports it.
  const enableResp: ITodoAppTodoUser.ISummary =
    await api.functional.auth.todoUser.mfa.enable.enableTwoFactor(connection, {
      body: {
        provisioningMethod: "totp",
        requireVerification: false,
      } satisfies ITodoAppTodoUser.IEnableMfa,
    });
  typia.assert(enableResp);

  // The enable operation returns an ISummary; at minimum the user identity
  // should remain the same (id invariant).
  TestValidator.equals("enable returns same user id", enableResp.id, auth.id);

  // --- 3) Disable MFA (sensitive operation) ---
  const disableResp: ITodoAppTodoUser.ISummary =
    await api.functional.auth.todoUser.mfa.disable.disableTwoFactor(
      connection,
      {
        body: {
          current_password: password,
          revoke_backup_codes: true,
        } satisfies ITodoAppTodoUser.IDisableMfa,
      },
    );
  typia.assert(disableResp);

  // Post-condition checks using available DTOs: identity preserved and
  // operation responded successfully.
  TestValidator.equals(
    "user id unchanged after disable",
    disableResp.id,
    auth.id,
  );
  TestValidator.predicate(
    "disable returned a valid summary id",
    typeof disableResp.id === "string",
  );
}
