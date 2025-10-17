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
 * Verify that MFA verification rejects invalid or malformed requests and does
 * not enable MFA.
 *
 * Business goal:
 *
 * - Ensure that submitting an invalid/malformed verification payload does NOT
 *   enable MFA and does not block subsequent enrollment attempts.
 *
 * Steps:
 *
 * 1. Join as a verified expert (MFA must be disabled by default)
 * 2. Begin MFA enrollment (server generates TOTP secret and provisioning URI)
 * 3. Call verify with a malformed body (no totp_code nor recovery_code) and expect
 *    an error
 * 4. Re-enroll again to confirm the flow is still available and MFA has not been
 *    enabled by mistake
 */
export async function test_api_verified_expert_mfa_verification_invalid_code(
  connection: api.IConnection,
) {
  // 1) Join as verified expert (token automatically set by SDK)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12), // >= 8 chars
    display_name: RandomGenerator.name(1),
    timezone: "Asia/Seoul",
    locale: "en-US",
    avatar_uri: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEconDiscussVerifiedExpertJoin.ICreate;
  const expert = await api.functional.auth.verifiedExpert.join(connection, {
    body: joinBody,
  });
  typia.assert<IEconDiscussVerifiedExpert.IAuthorized>(expert);
  TestValidator.equals(
    "MFA must be disabled immediately after join",
    expert.mfa_enabled,
    false,
  );

  // 2) Enroll MFA (method TOTP)
  const enrollBody = {
    method: "totp",
    device_label: "Authenticator App",
  } satisfies IEconDiscussVerifiedExpertMfaEnroll.ICreate;
  const enrollment =
    await api.functional.auth.verifiedExpert.mfa.enroll.enrollMfa(connection, {
      body: enrollBody,
    });
  typia.assert<IEconDiscussVerifiedExpertMfa.IEnroll>(enrollment);

  // 3) Attempt to verify with malformed/invalid payload
  await TestValidator.error(
    "verify should fail when no code is provided (malformed request)",
    async () => {
      await api.functional.auth.verifiedExpert.mfa.verify.verifyMfa(
        connection,
        {
          body: {} satisfies IEconDiscussVerifiedExpertMfaVerify.ICreate,
        },
      );
    },
  );

  // 4) Re-enroll again to prove failure did not enable MFA and the flow remains available
  const secondEnrollBody = {
    method: "totp",
    device_label: "Backup Authenticator",
  } satisfies IEconDiscussVerifiedExpertMfaEnroll.ICreate;
  const enrollment2 =
    await api.functional.auth.verifiedExpert.mfa.enroll.enrollMfa(connection, {
      body: secondEnrollBody,
    });
  typia.assert<IEconDiscussVerifiedExpertMfa.IEnroll>(enrollment2);
}
