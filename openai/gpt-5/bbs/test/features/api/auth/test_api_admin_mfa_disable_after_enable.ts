import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEAuthMfaMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IEAuthMfaMethod";
import type { IEconDiscussAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussAdmin";

/**
 * Disable MFA after enabling it through setup/verify flow.
 *
 * Steps:
 *
 * 1. Register a new admin (join) and ensure initial MFA state is disabled when
 *    subject is present.
 * 2. Start MFA enrollment (TOTP) to obtain provisioning info (assert type only).
 * 3. Verify MFA with a plausible one-time code payload, enabling MFA (assert
 *    security event).
 * 4. Disable MFA with a plausible confirmation payload (assert security event).
 * 5. Repeat disable to validate idempotent behavior (assert security event again).
 *
 * Notes:
 *
 * - Token handling is automatic via SDK; do not manipulate headers manually.
 * - Request bodies use the exact DTO variants with `satisfies`.
 * - All responses are validated using typia.assert; no redundant type checks.
 */
export async function test_api_admin_mfa_disable_after_enable(
  connection: api.IConnection,
) {
  // Helper: generate a 6-digit numeric code string
  const totp = (() => {
    const digits = [..."0123456789"];
    let s = "";
    for (let i = 0; i < 6; ++i) s += RandomGenerator.pick(digits);
    return s;
  })();

  // 1) Register a new admin (join)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12), // >= 8 chars
    display_name: RandomGenerator.name(1),
    timezone: "Asia/Seoul",
    locale: "en-US",
  } satisfies IEconDiscussAdmin.ICreate;
  const authorized: IEconDiscussAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: joinBody });
  typia.assert(authorized);
  if (authorized.admin !== undefined) {
    TestValidator.equals(
      "admin subject starts with MFA disabled",
      authorized.admin.mfaEnabled,
      false,
    );
  }

  // 2) Start MFA enrollment (TOTP)
  const setupBody = {
    method: "totp",
  } satisfies IEconDiscussAdmin.IMfaSetupRequest;
  const setup = await api.functional.auth.admin.mfa.setup.startMfaEnrollment(
    connection,
    { body: setupBody },
  );
  typia.assert(setup);

  // 3) Verify MFA (enable)
  const verifyBody = {
    method: "totp",
    code: totp,
  } satisfies IEconDiscussAdmin.IMfaVerifyRequest;
  const verifyEvent = await api.functional.auth.admin.mfa.verify.verifyMfa(
    connection,
    { body: verifyBody },
  );
  typia.assert(verifyEvent);

  // 4) Disable MFA
  const disableBody = {
    method: "totp",
    code: totp,
  } satisfies IEconDiscussAdmin.IMfaDisableRequest;
  const disableEvent = await api.functional.auth.admin.mfa.disableMfa(
    connection,
    { body: disableBody },
  );
  typia.assert(disableEvent);

  // 5) Disable again (idempotency check: expect success event as well)
  const disableEventAgain = await api.functional.auth.admin.mfa.disableMfa(
    connection,
    { body: disableBody },
  );
  typia.assert(disableEventAgain);
}
