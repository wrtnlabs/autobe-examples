import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEAuthMfaMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IEAuthMfaMethod";
import type { IEconDiscussAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussAdmin";

/**
 * Verify MFA recovery code regeneration is rejected when MFA is not enabled.
 *
 * Business flow
 *
 * 1. Register a new admin (join) to obtain an authenticated session via SDK
 *    side-effect.
 * 2. Start MFA enrollment (TOTP) but DO NOT verify, so MFA remains disabled.
 * 3. Attempt to regenerate recovery codes with a plausible TOTP code.
 * 4. Expect an error (no status code assertion) and ensure no codes are returned.
 */
export async function test_api_admin_mfa_recovery_codes_regenerate_without_enabled(
  connection: api.IConnection,
) {
  // 1) Register a new admin (join) and become authenticated
  const createAdminBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(2),
    timezone: "Asia/Seoul",
    locale: "en-US",
  } satisfies IEconDiscussAdmin.ICreate;

  const authorized = await api.functional.auth.admin.join(connection, {
    body: createAdminBody,
  });
  typia.assert(authorized);

  // If subject projection is present, MFA should be disabled at join time
  if (authorized.admin !== undefined) {
    TestValidator.predicate(
      "MFA must be disabled immediately after join",
      authorized.admin.mfaEnabled === false,
    );
  }

  // 2) Start MFA enrollment (TOTP) but do NOT verify (MFA remains disabled)
  const setup = await api.functional.auth.admin.mfa.setup.startMfaEnrollment(
    connection,
    {
      body: {
        method: "totp",
      } satisfies IEconDiscussAdmin.IMfaSetupRequest,
    },
  );
  typia.assert(setup);
  TestValidator.equals(
    "MFA setup method should echo 'totp'",
    setup.method,
    "totp",
  );

  // 3) Attempt to regenerate recovery codes while MFA is still NOT enabled
  const totpCandidate = typia
    .random<number & tags.Type<"uint32"> & tags.Maximum<999999>>()
    .toString()
    .padStart(6, "0");

  await TestValidator.error(
    "regenerating recovery codes must fail when MFA is not enabled",
    async () => {
      await api.functional.auth.admin.mfa.recovery_codes.regen.regenerateMfaRecoveryCodes(
        connection,
        {
          body: {
            totpCode: totpCandidate,
          } satisfies IEconDiscussAdmin.IMfaRegenerateRequest,
        },
      );
    },
  );
}
