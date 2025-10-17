import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconDiscussVerifiedExpert } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVerifiedExpert";
import type { IEconDiscussVerifiedExpertJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVerifiedExpertJoin";
import type { IEconDiscussVerifiedExpertMfa } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVerifiedExpertMfa";
import type { IEconDiscussVerifiedExpertMfaEnroll } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVerifiedExpertMfaEnroll";
import type { IEconDiscussVerifiedExpertMfaVerify } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVerifiedExpertMfaVerify";

/**
 * Verify MFA using a recovery code in the verifiedExpert context.
 *
 * Business journey:
 *
 * 1. Join as a verified expert account (mfa_enabled should be false).
 * 2. Enroll into MFA (TOTP) to obtain provisioning data (otpauth_uri).
 * 3. Verify MFA by submitting a recovery_code payload.
 * 4. Expect verification response to indicate mfa_enabled=true.
 *
 * Notes on feasibility:
 *
 * - The enrollment response (IEconDiscussVerifiedExpertMfa.IEnroll) does not
 *   include recovery codes in provided DTOs. Therefore, this test submits a
 *   recovery_code shaped payload per contract and verifies success via returned
 *   status.
 * - Reuse (one-time code) negative test is skipped due to lack of recovery-code
 *   retrieval; would otherwise require a second submission of the same code.
 */
export async function test_api_verified_expert_mfa_verification_with_recovery_code(
  connection: api.IConnection,
) {
  // 1) Join as verified expert
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
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
    "mfa should be disabled right after join",
    authorized.mfa_enabled,
    false,
  );

  // 2) Enroll MFA (TOTP)
  const enrollBody = {
    method: "totp" as const,
    device_label: RandomGenerator.name(1),
  } satisfies IEconDiscussVerifiedExpertMfaEnroll.ICreate;
  const enrollment: IEconDiscussVerifiedExpertMfa.IEnroll =
    await api.functional.auth.verifiedExpert.mfa.enroll.enrollMfa(connection, {
      body: enrollBody,
    });
  typia.assert(enrollment);

  // 3) Verify MFA using a recovery code payload
  //    IMPORTANT: IEconDiscussVerifiedExpertMfaVerify.ICreate is declared as `any`.
  //    To respect "Never use `satisfies any`", do not attach `satisfies` here.
  const verifyBody = {
    recovery_code: RandomGenerator.alphaNumeric(10),
  };
  const status: IEconDiscussVerifiedExpertMfa.IStatus =
    await api.functional.auth.verifiedExpert.mfa.verify.verifyMfa(connection, {
      body: verifyBody,
    });
  typia.assert(status);

  // 4) Expect MFA to be enabled after verification
  TestValidator.equals(
    "mfa should be enabled after successful verification",
    status.mfa_enabled,
    true,
  );
}
