import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEAuthMfaMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IEAuthMfaMethod";
import type { IEconDiscussAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussAdmin";

export async function test_api_admin_mfa_recovery_codes_regenerate(
  connection: api.IConnection,
) {
  /** 1. Register a new admin (join) to obtain an authenticated context */
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(1),
    timezone: "Asia/Seoul",
    locale: "en-US",
    avatar_uri: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEconDiscussAdmin.ICreate;
  const authorized = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(authorized);

  /** 2. Start MFA enrollment (TOTP) */
  const mfaSetupBody = {
    method: "totp",
  } satisfies IEconDiscussAdmin.IMfaSetupRequest;
  const mfaSetup = await api.functional.auth.admin.mfa.setup.startMfaEnrollment(
    connection,
    { body: mfaSetupBody },
  );
  typia.assert(mfaSetup);
  TestValidator.equals(
    "MFA setup method should be 'totp'",
    mfaSetup.method,
    "totp",
  );

  /** Helper: create a 6-digit numeric string to simulate a TOTP code */
  const digits = [..."0123456789"] as const;
  const totpCode = ArrayUtil.repeat(6, () => RandomGenerator.pick(digits)).join(
    "",
  );

  /** 3. Verify MFA using a one-time code to enable MFA */
  const verifyBody = {
    code: totpCode,
  } satisfies IEconDiscussAdmin.IMfaVerifyRequest;
  const verified = await api.functional.auth.admin.mfa.verify.verifyMfa(
    connection,
    { body: verifyBody },
  );
  typia.assert(verified);

  /** 4. Regenerate recovery codes by proving possession of TOTP factor */
  const regenBody = {
    totpCode,
  } satisfies IEconDiscussAdmin.IMfaRegenerateRequest;
  const recovery =
    await api.functional.auth.admin.mfa.recovery_codes.regen.regenerateMfaRecoveryCodes(
      connection,
      { body: regenBody },
    );
  typia.assert(recovery);

  // Business validations on recovery payload
  TestValidator.predicate(
    "recovery codes list must be non-empty",
    recovery.codes.length > 0,
  );
  TestValidator.equals(
    "recovery count equals codes.length",
    recovery.codes.length,
    recovery.count,
  );
}
