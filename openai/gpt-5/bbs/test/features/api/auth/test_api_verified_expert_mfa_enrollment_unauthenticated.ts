import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IEconDiscussVerifiedExpertMfa } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVerifiedExpertMfa";
import type { IEconDiscussVerifiedExpertMfaEnroll } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVerifiedExpertMfaEnroll";

/**
 * Authentication boundary: MFA enrollment must reject unauthenticated calls.
 *
 * Business context
 *
 * - Verified experts initiate TOTP MFA enrollment via a protected endpoint that
 *   returns a provisioning otpauth URI. This operation must require a valid
 *   authenticated session.
 *
 * What this test validates
 *
 * 1. Creating an unauthenticated connection (empty headers) does not grant access
 *    to the enrollment endpoint.
 * 2. A well-typed, valid request body still fails without authentication.
 * 3. No assumptions on specific HTTP status codes are made; only that an error
 *    occurs for unauthenticated access.
 *
 * Steps
 *
 * 1. Clone given connection into an unauthenticated one with headers: {}.
 * 2. Build IEconDiscussVerifiedExpertMfaEnroll.ICreate body with method "totp" and
 *    an optional device_label within limits.
 * 3. Attempt POST /auth/verifiedExpert/mfa/enroll and expect an error.
 */
export async function test_api_verified_expert_mfa_enrollment_unauthenticated(
  connection: api.IConnection,
) {
  // 1) Create unauthenticated connection (do not manipulate headers further)
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 2) Prepare a valid enrollment body (method must be the literal "totp")
  const body = {
    method: "totp",
    device_label: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 3,
      wordMax: 8,
    }),
  } satisfies IEconDiscussVerifiedExpertMfaEnroll.ICreate;

  // 3) Call the protected endpoint expecting an error due to missing auth
  await TestValidator.error(
    "unauthenticated verified-expert MFA enrollment should be rejected",
    async () => {
      await api.functional.auth.verifiedExpert.mfa.enroll.enrollMfa(
        unauthConn,
        {
          body,
        },
      );
    },
  );
}
