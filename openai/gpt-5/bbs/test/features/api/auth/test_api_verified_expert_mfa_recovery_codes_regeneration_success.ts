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
import type { IEconDiscussVerifiedExpertMfaVerify } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVerifiedExpertMfaVerify";

/**
 * Regenerate MFA recovery codes for a verified expert after completing MFA
 * setup.
 *
 * Flow:
 *
 * 1. Join as verified expert (mfa_enabled expected false)
 * 2. Enroll MFA with method="totp" and receive provisioning URI
 * 3. Verify MFA using a 6-digit TOTP-like code and expect mfa_enabled=true
 * 4. Security boundary: unauthenticated regeneration attempt should fail
 * 5. Regenerate recovery codes (first rotation) and validate
 *    shape/quantity/uniqueness
 * 6. Regenerate again (second rotation) and assert rotation (codes differ from
 *    previous)
 */
export async function test_api_verified_expert_mfa_recovery_codes_regeneration_success(
  connection: api.IConnection,
) {
  // 1) Join as verified expert
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(2),
    timezone: "Asia/Seoul",
    locale: "en-US",
    avatar_uri: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEconDiscussVerifiedExpertJoin.ICreate;
  const expert = await api.functional.auth.verifiedExpert.join(connection, {
    body: joinBody,
  });
  typia.assert<IEconDiscussVerifiedExpert.IAuthorized>(expert);
  TestValidator.equals(
    "mfa should be disabled right after join",
    expert.mfa_enabled,
    false,
  );

  // 2) Enroll MFA (TOTP)
  const enrollBody = {
    method: "totp",
    device_label: RandomGenerator.name(1),
  } satisfies IEconDiscussVerifiedExpertMfaEnroll.ICreate;
  const enroll = await api.functional.auth.verifiedExpert.mfa.enroll.enrollMfa(
    connection,
    { body: enrollBody },
  );
  typia.assert<IEconDiscussVerifiedExpertMfa.IEnroll>(enroll);

  // 3) Verify MFA (complete setup -> mfa_enabled=true)
  const verifyTotp = typia.random<string & tags.Pattern<"^[0-9]{6}$">>();
  const status = await api.functional.auth.verifiedExpert.mfa.verify.verifyMfa(
    connection,
    {
      // IEconDiscussVerifiedExpertMfaVerify.ICreate is declared as any | any,
      // so we avoid `satisfies any` per rules and pass a plain object.
      body: { totp_code: verifyTotp },
    },
  );
  typia.assert<IEconDiscussVerifiedExpertMfa.IStatus>(status);
  TestValidator.equals(
    "mfa should be enabled after verification",
    status.mfa_enabled,
    true,
  );

  // 4) Security boundary: unauthenticated call must error
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user cannot regenerate recovery codes",
    async () => {
      await api.functional.auth.verifiedExpert.mfa.recovery_codes.regenerateMfaRecoveryCodes(
        unauthConn,
        {
          body: {
            totp_code: typia.random<string & tags.Pattern<"^[0-9]{6}$">>(),
          } satisfies IEconDiscussVerifiedExpertMfaRecovery.ICreate,
        },
      );
    },
  );

  // 5) Regenerate recovery codes (first rotation)
  const regenBody1 = {
    totp_code: typia.random<string & tags.Pattern<"^[0-9]{6}$">>(),
  } satisfies IEconDiscussVerifiedExpertMfaRecovery.ICreate;
  const regen1 =
    await api.functional.auth.verifiedExpert.mfa.recovery_codes.regenerateMfaRecoveryCodes(
      connection,
      { body: regenBody1 },
    );
  typia.assert<IEconDiscussVerifiedExpertMfa.IRecoveryCodes>(regen1);
  TestValidator.predicate(
    "first rotation should return at least 5 codes",
    regen1.codes.length >= 5,
  );
  TestValidator.equals(
    "first rotation codes should be unique",
    new Set(regen1.codes).size,
    regen1.codes.length,
  );

  // 6) Regenerate again (second rotation) and assert rotation
  const regenBody2 = {
    totp_code: typia.random<string & tags.Pattern<"^[0-9]{6}$">>(),
  } satisfies IEconDiscussVerifiedExpertMfaRecovery.ICreate;
  const regen2 =
    await api.functional.auth.verifiedExpert.mfa.recovery_codes.regenerateMfaRecoveryCodes(
      connection,
      { body: regenBody2 },
    );
  typia.assert<IEconDiscussVerifiedExpertMfa.IRecoveryCodes>(regen2);
  TestValidator.notEquals(
    "second rotation should return a different set of codes",
    regen2.codes,
    regen1.codes,
  );
  TestValidator.predicate(
    "second rotation should also return at least 5 codes",
    regen2.codes.length >= 5,
  );
  TestValidator.equals(
    "second rotation codes should be unique",
    new Set(regen2.codes).size,
    regen2.codes.length,
  );
}
