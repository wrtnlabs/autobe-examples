import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IEconDiscussVerifiedExpertMfa } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVerifiedExpertMfa";
import type { IEconDiscussVerifiedExpertMfaDisable } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVerifiedExpertMfaDisable";

/**
 * Authentication boundary: unauthenticated requests must fail when disabling
 * MFA.
 *
 * This test verifies that POST /auth/verifiedExpert/mfa/disable cannot be
 * invoked without an Authorization context. It constructs an unauthenticated
 * connection (headers: {}) and attempts to disable MFA with a valid request
 * body using the TOTP flow. The call must throw an error.
 *
 * Steps:
 *
 * 1. Build unauthenticated connection without touching the original headers
 * 2. Invoke disableMfa with a valid IEconDiscussVerifiedExpertMfaDisable.ICreate
 *    (method: "totp", 6-digit totp_code)
 * 3. Assert that an error is thrown. Do not assert specific HTTP status codes
 */
export async function test_api_verified_expert_mfa_disable_unauthenticated(
  connection: api.IConnection,
) {
  // 1) Create an unauthenticated connection (do not touch original headers)
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 2) Prepare a valid request body using the discriminated union (method: "totp")
  const body = {
    method: "totp",
    totp_code: "123456",
  } satisfies IEconDiscussVerifiedExpertMfaDisable.ICreate;

  // 3) Unauthenticated call must throw an error (no status code assertion)
  await TestValidator.error(
    "unauthenticated user cannot disable verified expert MFA",
    async () => {
      await api.functional.auth.verifiedExpert.mfa.disable.disableMfa(
        unauthConn,
        { body },
      );
    },
  );
}
