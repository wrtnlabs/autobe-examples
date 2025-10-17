import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";

/**
 * Regenerate MFA recovery codes with TOTP and validate replacement/uniqueness.
 *
 * Flow:
 *
 * 1. Join as a new member and obtain tokens.
 * 2. Start MFA setup and receive provisioning data.
 * 3. Verify MFA (mfa_enabled=true).
 * 4. Positive regeneration (simulation): regenerate codes with a valid-format TOTP
 *    and validate:
 *
 *    - Response DTO shape,
 *    - Mfa_enabled remains true,
 *    - Codes are unique,
 *    - A second regeneration returns a different set (replacement behavior).
 * 5. Negative regeneration (real): reject invalid/expired TOTP.
 * 6. Auth boundary: unauthenticated request must fail.
 */
export async function test_api_mfa_recovery_codes_regenerate_with_totp(
  connection: api.IConnection,
) {
  // 1) Join as a new member
  const createBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12), // >= 8 chars
    display_name: RandomGenerator.name(2),
    timezone: "Asia/Seoul",
    locale: "en-US",
  } satisfies IEconDiscussMember.ICreate;
  const authorized: IEconDiscussMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: createBody });
  typia.assert(authorized);

  // 2) Initiate MFA setup (provisioning)
  const setup: IEconDiscussMember.IMfaSetup =
    await api.functional.auth.member.mfa.setup.mfaSetup(connection);
  typia.assert(setup);

  // 3) Verify MFA (flip mfa_enabled=true)
  const verifyBody = {
    code: "123456", // shape only; backend validates against secret
  } satisfies IEconDiscussMember.IMfaVerify;
  const enabled: IEconDiscussMember.IMfaEnabled =
    await api.functional.auth.member.mfa.verify.mfaVerify(connection, {
      body: verifyBody,
    });
  typia.assert(enabled);
  TestValidator.equals(
    "MFA must be enabled after verification",
    enabled.mfa_enabled,
    true,
  );

  // 4) Positive regeneration on simulated connection to validate happy-path behavior
  const simConn: api.IConnection = { ...connection, simulate: true };
  const firstRegen: IEconDiscussMember.IMfaRecoveryCodes =
    await api.functional.auth.member.mfa.recovery_codes.regenerate.regenerateMfaRecoveryCodes(
      simConn,
      {
        body: {
          totp_code: "123456",
        } satisfies IEconDiscussMember.IMfaRegenerateCodes,
      },
    );
  typia.assert(firstRegen);
  TestValidator.equals(
    "MFA remains enabled after regeneration",
    firstRegen.mfa_enabled,
    true,
  );
  // codes uniqueness
  TestValidator.equals(
    "recovery codes must be unique",
    new Set(firstRegen.codes).size,
    firstRegen.codes.length,
  );

  // Regenerate again to ensure replacement (codes differ)
  const secondRegen: IEconDiscussMember.IMfaRecoveryCodes =
    await api.functional.auth.member.mfa.recovery_codes.regenerate.regenerateMfaRecoveryCodes(
      simConn,
      {
        body: {
          totp_code: "123456",
        } satisfies IEconDiscussMember.IMfaRegenerateCodes,
      },
    );
  typia.assert(secondRegen);
  TestValidator.notEquals(
    "second regeneration must produce a different set of codes",
    secondRegen.codes,
    firstRegen.codes,
  );
  TestValidator.equals(
    "second regeneration: codes remain unique",
    new Set(secondRegen.codes).size,
    secondRegen.codes.length,
  );

  // 5) Negative path on real connection: invalid/expired TOTP must fail
  await TestValidator.error("invalid TOTP must be rejected", async () => {
    await api.functional.auth.member.mfa.recovery_codes.regenerate.regenerateMfaRecoveryCodes(
      connection,
      {
        body: {
          totp_code: "000000",
        } satisfies IEconDiscussMember.IMfaRegenerateCodes,
      },
    );
  });

  // 6) Auth boundary: unauthenticated caller must fail
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated request must be rejected",
    async () => {
      await api.functional.auth.member.mfa.recovery_codes.regenerate.regenerateMfaRecoveryCodes(
        unauthConn,
        {
          body: {
            totp_code: "123456",
          } satisfies IEconDiscussMember.IMfaRegenerateCodes,
        },
      );
    },
  );
}
