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

/**
 * Disable MFA must fail when MFA is not enabled.
 *
 * Business context:
 *
 * - Newly joined verifiedExpert accounts start with mfa_enabled=false.
 * - An enrollment "totp" step issues provisioning info but does not enable MFA
 *   until verification (not part of this scenario) succeeds.
 *
 * Test steps:
 *
 * 1. Join as a verified expert (mfa_enabled should be false).
 * 2. Optionally enroll MFA with method="totp" (still mfa_enabled=false).
 * 3. Attempt to disable MFA using: 3-1) method="totp" with a valid 6-digit code →
 *    expect error 3-2) method="recovery" with a valid recovery code pattern →
 *    expect error
 *
 * Validation:
 *
 * - Use typia.assert on successful responses (join, enroll).
 * - Confirm initial mfa_enabled is false.
 * - Use TestValidator.error to ensure disable attempts fail (no HTTP status
 *   assertion).
 */
export async function test_api_verified_expert_mfa_disable_without_enabled_mfa(
  connection: api.IConnection,
) {
  // 1) Join as verified expert
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(2),
    timezone: "Asia/Seoul",
    locale: "en-US",
    // avatar_uri: typia.random<string & tags.Format<"uri">>(), // optional
  } satisfies IEconDiscussVerifiedExpertJoin.ICreate;
  const me: IEconDiscussVerifiedExpert.IAuthorized =
    await api.functional.auth.verifiedExpert.join(connection, {
      body: joinBody,
    });
  typia.assert(me);

  // Ensure MFA is disabled by default after join
  TestValidator.equals(
    "mfa is disabled immediately after join",
    me.mfa_enabled,
    false,
  );

  // 2) Enroll MFA (without verify) - remains disabled
  const enrollBody = {
    method: "totp",
    device_label: RandomGenerator.name(2).slice(0, 50),
  } satisfies IEconDiscussVerifiedExpertMfaEnroll.ICreate;
  const enroll: IEconDiscussVerifiedExpertMfa.IEnroll =
    await api.functional.auth.verifiedExpert.mfa.enroll.enrollMfa(connection, {
      body: enrollBody,
    });
  typia.assert(enroll);

  // 3) Attempt to disable while MFA is not enabled
  // 3-1) using TOTP code (6 digits)
  const digits = [..."0123456789"];
  const totpCode = ArrayUtil.repeat(6, () => RandomGenerator.pick(digits)).join(
    "",
  );
  const disableTotp = {
    method: "totp",
    totp_code: totpCode,
  } satisfies IEconDiscussVerifiedExpertMfaDisable.ITotp;
  await TestValidator.error(
    "disabling MFA should fail when not enabled (totp)",
    async () => {
      await api.functional.auth.verifiedExpert.mfa.disable.disableMfa(
        connection,
        {
          body: disableTotp,
        },
      );
    },
  );

  // 3-2) using Recovery code (8-64, alnum/hyphen)
  const recoveryCode = RandomGenerator.alphaNumeric(12);
  const disableRecovery = {
    method: "recovery",
    recovery_code: recoveryCode,
  } satisfies IEconDiscussVerifiedExpertMfaDisable.IRecovery;
  await TestValidator.error(
    "disabling MFA should fail when not enabled (recovery)",
    async () => {
      await api.functional.auth.verifiedExpert.mfa.disable.disableMfa(
        connection,
        {
          body: disableRecovery,
        },
      );
    },
  );
}
