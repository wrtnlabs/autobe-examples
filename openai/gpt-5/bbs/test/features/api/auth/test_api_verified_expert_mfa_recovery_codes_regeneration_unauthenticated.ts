import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IEconDiscussVerifiedExpertMfa } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVerifiedExpertMfa";
import type { IEconDiscussVerifiedExpertMfaRecovery } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVerifiedExpertMfaRecovery";

/**
 * Authentication boundary: MFA recovery codes regeneration requires
 * authentication.
 *
 * This test verifies that calling the verified expert MFA recovery codes
 * regeneration endpoint without an Authorization context results in an error.
 *
 * Steps:
 *
 * 1. Build an unauthenticated connection (empty headers) from the given
 *    connection.
 * 2. Prepare a valid body satisfying IEconDiscussVerifiedExpertMfaRecovery.ICreate
 *    using a syntactically-correct 6-digit TOTP string.
 * 3. Call the endpoint with unauthenticated connection and expect an error.
 *
 * Notes:
 *
 * - Do NOT validate specific HTTP status codes; only assert that an error occurs.
 * - Do NOT manipulate connection.headers beyond creating an empty headers object.
 */
export async function test_api_verified_expert_mfa_recovery_codes_regeneration_unauthenticated(
  connection: api.IConnection,
) {
  // 1) Create unauthenticated connection (do not manipulate headers after this point)
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 2) Prepare a valid request body for regeneration
  const body = {
    totp_code: typia.random<string & tags.Pattern<"^[0-9]{6}$">>(),
  } satisfies IEconDiscussVerifiedExpertMfaRecovery.ICreate;

  // 3) Expect error on unauthenticated call (async callback MUST be awaited)
  await TestValidator.error(
    "unauthenticated regeneration must be rejected",
    async () => {
      await api.functional.auth.verifiedExpert.mfa.recovery_codes.regenerateMfaRecoveryCodes(
        unauthConn,
        { body },
      );
    },
  );
}
