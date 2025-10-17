import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconDiscussVerifiedExpert } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVerifiedExpert";
import type { IEconDiscussVerifiedExpertJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVerifiedExpertJoin";
import type { IEconDiscussVerifiedExpertMfa } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVerifiedExpertMfa";
import type { IEconDiscussVerifiedExpertMfaDisable } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVerifiedExpertMfaDisable";
import type { IEconDiscussVerifiedExpertMfaEnroll } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVerifiedExpertMfaEnroll";
import type { IEconDiscussVerifiedExpertMfaVerify } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVerifiedExpertMfaVerify";

/**
 * Disable MFA using a valid TOTP after enrollment and verification.
 *
 * Business goal:
 *
 * - Ensure a verified expert can successfully turn off MFA after it has been
 *   enabled via TOTP verification.
 *
 * Steps:
 *
 * 1. Join as verified expert (initially mfa_enabled=false)
 * 2. Enroll MFA with method "totp"
 * 3. Verify MFA (simulate submitting a 6-digit TOTP) -> expect mfa_enabled=true
 * 4. Disable MFA with method "totp" using a 6-digit TOTP -> expect
 *    mfa_enabled=false
 *
 * Notes:
 *
 * - Authentication tokens are handled by the SDK (no manual header handling).
 * - Typia.assert performs complete type validation; additional type checks are
 *   intentionally omitted.
 */
export async function test_api_verified_expert_mfa_disable_with_valid_totp_after_verification(
  connection: api.IConnection,
) {
  // 1) Join as verified expert (expect MFA disabled by default)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12), // >= 8 chars
    display_name: RandomGenerator.name(1),
    timezone: "Asia/Seoul",
    locale: "en-US",
    avatar_uri: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEconDiscussVerifiedExpertJoin.ICreate;
  const authorized: IEconDiscussVerifiedExpert.IAuthorized =
    await api.functional.auth.verifiedExpert.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);
  TestValidator.equals(
    "MFA is disabled right after join",
    authorized.mfa_enabled,
    false,
  );

  // 2) Enroll MFA with method "totp"
  const enrollBody = {
    method: "totp",
    device_label: RandomGenerator.name(1),
  } satisfies IEconDiscussVerifiedExpertMfaEnroll.ICreate;
  const enrollment: IEconDiscussVerifiedExpertMfa.IEnroll =
    await api.functional.auth.verifiedExpert.mfa.enroll.enrollMfa(connection, {
      body: enrollBody,
    });
  typia.assert(enrollment);

  // Helper to generate a 6-digit numeric string for TOTP-like payloads
  const sixDigits = () =>
    ArrayUtil.repeat(6, () => RandomGenerator.pick([..."0123456789"])).join("");

  // 3) Verify MFA (expect mfa_enabled=true)
  const verifyStatus: IEconDiscussVerifiedExpertMfa.IStatus =
    await api.functional.auth.verifiedExpert.mfa.verify.verifyMfa(connection, {
      // IEconDiscussVerifiedExpertMfaVerify.ICreate is `any`; avoid `satisfies any`.
      body: { method: "totp", totp_code: sixDigits() },
    });
  typia.assert(verifyStatus);
  TestValidator.equals(
    "MFA becomes enabled after verification",
    verifyStatus.mfa_enabled,
    true,
  );

  // 4) Disable MFA using method "totp" (expect mfa_enabled=false)
  const disableBody = {
    method: "totp",
    totp_code: sixDigits(),
  } satisfies IEconDiscussVerifiedExpertMfaDisable.ITotp;
  const disableStatus: IEconDiscussVerifiedExpertMfa.IStatus =
    await api.functional.auth.verifiedExpert.mfa.disable.disableMfa(
      connection,
      {
        body: disableBody,
      },
    );
  typia.assert(disableStatus);
  TestValidator.equals(
    "MFA becomes disabled after disable operation",
    disableStatus.mfa_enabled,
    false,
  );
}
