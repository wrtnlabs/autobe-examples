import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconDiscussVerifiedExpert } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVerifiedExpert";
import type { IEconDiscussVerifiedExpertJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVerifiedExpertJoin";
import type { IEconDiscussVerifiedExpertMfa } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVerifiedExpertMfa";
import type { IEconDiscussVerifiedExpertMfaEnroll } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVerifiedExpertMfaEnroll";
import type { IEconDiscussVerifiedExpertMfaRecovery } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVerifiedExpertMfaRecovery";

/**
 * Regeneration of MFA recovery codes requires MFA to be enabled.
 *
 * Scenario:
 *
 * 1. Join as verifiedExpert -> initial mfa_enabled=false.
 * 2. Start MFA enrollment (method "totp"); MFA still disabled at this point.
 * 3. Attempt to regenerate recovery codes while MFA is not enabled.
 * 4. Expect the regeneration call to fail (business rule), without asserting
 *    status code.
 *
 * Notes:
 *
 * - Authentication token management is handled by the SDK after join; the test
 *   does not touch headers.
 * - Validate response types using typia.assert().
 */
export async function test_api_verified_expert_mfa_recovery_codes_regeneration_requires_enabled_mfa(
  connection: api.IConnection,
) {
  // 1) Join as verified expert (mfa_enabled must be false by default)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12), // >= 8 chars
    display_name: RandomGenerator.name(1),
    timezone: "Asia/Seoul",
    locale: "en-US",
  } satisfies IEconDiscussVerifiedExpertJoin.ICreate;
  const authorized = await api.functional.auth.verifiedExpert.join(connection, {
    body: joinBody,
  });
  typia.assert<IEconDiscussVerifiedExpert.IAuthorized>(authorized);

  TestValidator.equals(
    "MFA should be disabled right after join",
    authorized.mfa_enabled,
    false,
  );

  // 2) Begin MFA enrollment with method TOTP
  const enrollBody = {
    method: "totp",
    device_label: RandomGenerator.name(1),
  } satisfies IEconDiscussVerifiedExpertMfaEnroll.ICreate;
  const enrollment =
    await api.functional.auth.verifiedExpert.mfa.enroll.enrollMfa(connection, {
      body: enrollBody,
    });
  typia.assert<IEconDiscussVerifiedExpertMfa.IEnroll>(enrollment);

  // 3) Attempt to regenerate recovery codes while MFA is not enabled
  // Build a syntactically valid 6-digit TOTP code
  const digits = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;
  const totpCode = ArrayUtil.repeat(6, () => RandomGenerator.pick(digits)).join(
    "",
  );

  // 4) Expect error (business rule) without asserting specific HTTP status
  await TestValidator.error(
    "regenerating recovery codes should fail when MFA is not enabled",
    async () => {
      await api.functional.auth.verifiedExpert.mfa.recovery_codes.regenerateMfaRecoveryCodes(
        connection,
        {
          body: {
            totp_code: totpCode,
          } satisfies IEconDiscussVerifiedExpertMfaRecovery.ICreate,
        },
      );
    },
  );
}
