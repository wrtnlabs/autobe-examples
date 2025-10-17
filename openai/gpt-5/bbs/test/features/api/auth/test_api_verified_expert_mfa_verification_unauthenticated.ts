import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IEconDiscussVerifiedExpertMfa } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVerifiedExpertMfa";
import type { IEconDiscussVerifiedExpertMfaVerify } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVerifiedExpertMfaVerify";

/**
 * Verify MFA (2FA) rejects unauthenticated requests.
 *
 * Business context:
 *
 * - MFA verification finalizes setup for verified experts and must be protected.
 * - Without a bearer token, the server must reject the request.
 *
 * Steps:
 *
 * 1. Create an unauthenticated connection (empty headers).
 * 2. Prepare a minimal request body that satisfies
 *    IEconDiscussVerifiedExpertMfaVerify.ICreate.
 * 3. Call verifyMfa and expect an error using TestValidator.error (no status code
 *    assertion).
 */
export async function test_api_verified_expert_mfa_verification_unauthenticated(
  connection: api.IConnection,
) {
  // 1) Create an unauthenticated connection (do not touch headers afterwards)
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 2) Minimal request body to satisfy the DTO without inventing properties
  const requestBody = {
    // intentionally minimal for auth-boundary testing
  } satisfies IEconDiscussVerifiedExpertMfaVerify.ICreate;

  // 3) Expect error on unauthenticated call (no status code checks)
  await TestValidator.error(
    "unauthenticated MFA verification must be rejected",
    async () => {
      await api.functional.auth.verifiedExpert.mfa.verify.verifyMfa(
        unauthConn,
        {
          body: requestBody,
        },
      );
    },
  );
}
