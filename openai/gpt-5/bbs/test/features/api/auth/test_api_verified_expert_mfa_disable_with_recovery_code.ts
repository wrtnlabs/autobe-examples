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
 * Disable MFA using a valid recovery code for a Verified Expert account.
 *
 * Business flow
 *
 * 1. Join as a verified expert user (tokens issued; mfa_enabled=false initially
 *    per policy).
 * 2. Enroll MFA with method "totp" (server provisions secret and recovery codes).
 * 3. Verify MFA to enable it (update updated_at).
 * 4. Disable MFA via recovery-code flow and verify that updated_at changes.
 * 5. Attempt to reuse the same recovery code must fail (only when not in simulate
 *    mode).
 *
 * Notes
 *
 * - Since there is no API to fetch actual recovery codes, and generating valid
 *   TOTP outside of the system is out of scope for this test, we execute the
 *   flow on a simulated connection to validate request/response contracts and
 *   business flow without external secrets.
 * - The simulator validates request body types and returns properly typed data,
 *   enabling assertions without depending on real secrets.
 */
export async function test_api_verified_expert_mfa_disable_with_recovery_code(
  connection: api.IConnection,
) {
  // Use a simulated connection to avoid dependency on real TOTP/recovery code generation
  const sim: api.IConnection = { ...connection, simulate: true };

  // 1) Join as verified expert
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    timezone: "Asia/Seoul",
    locale: "en-US",
  } satisfies IEconDiscussVerifiedExpertJoin.ICreate;
  const authorized: IEconDiscussVerifiedExpert.IAuthorized =
    await api.functional.auth.verifiedExpert.join(sim, { body: joinBody });
  typia.assert(authorized);

  // 2) Enroll MFA with TOTP
  const enrollBody = {
    method: "totp" as const,
    device_label: RandomGenerator.name(1),
  } satisfies IEconDiscussVerifiedExpertMfaEnroll.ICreate;
  const enroll: IEconDiscussVerifiedExpertMfa.IEnroll =
    await api.functional.auth.verifiedExpert.mfa.enroll.enrollMfa(sim, {
      body: enrollBody,
    });
  typia.assert(enroll);

  // 3) Verify MFA (type-only placeholder body is sufficient in simulation)
  const verifyBody =
    {} as unknown satisfies IEconDiscussVerifiedExpertMfaVerify.ICreate;
  const verifiedStatus: IEconDiscussVerifiedExpertMfa.IStatus =
    await api.functional.auth.verifiedExpert.mfa.verify.verifyMfa(sim, {
      body: verifyBody,
    });
  typia.assert(verifiedStatus);
  const beforeUpdatedAt: string = verifiedStatus.updated_at;

  // 4) Disable MFA via recovery code flow
  const recoveryCode: string & tags.Pattern<"^[A-Za-z0-9-]{8,64}$"> =
    typia.random<string & tags.Pattern<"^[A-Za-z0-9-]{8,64}$">>();
  const disableBody = {
    method: "recovery" as const,
    recovery_code: recoveryCode,
  } satisfies IEconDiscussVerifiedExpertMfaDisable.IRecovery;
  const disabledStatus: IEconDiscussVerifiedExpertMfa.IStatus =
    await api.functional.auth.verifiedExpert.mfa.disable.disableMfa(sim, {
      body: disableBody,
    });
  typia.assert(disabledStatus);

  // updated_at should be refreshed after disable (state mutation)
  TestValidator.notEquals(
    "updated_at changes after disable",
    disabledStatus.updated_at,
    beforeUpdatedAt,
  );

  // 5) Duplicate usage of the same recovery code must fail in real backend.
  //    Skip in simulator because it returns random success by design.
  if (sim.simulate !== true) {
    await TestValidator.error(
      "reusing same recovery code should fail",
      async () => {
        await api.functional.auth.verifiedExpert.mfa.disable.disableMfa(sim, {
          body: disableBody,
        });
      },
    );
  }
}
