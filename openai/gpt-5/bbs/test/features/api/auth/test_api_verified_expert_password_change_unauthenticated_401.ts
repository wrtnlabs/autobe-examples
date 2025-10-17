import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IEconDiscussVerifiedExpertPassword } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVerifiedExpertPassword";

/**
 * Verify unauthenticated requests are rejected on password update.
 *
 * Business purpose: Only authenticated verified experts can change their
 * credentials. This test ensures the authentication boundary properly denies
 * access when no Authorization is provided.
 *
 * Steps:
 *
 * 1. Build a valid password-change payload using proper DTO constraints.
 * 2. Create an unauthenticated connection clone with empty headers (no tokens).
 * 3. Call PUT /auth/verifiedExpert/password and assert that it throws.
 *
 * Notes:
 *
 * - We do not check a specific HTTP status code; we only assert that an error
 *   occurs as per E2E guideline.
 * - The endpoint returns void on success, thus no response assertion is needed.
 */
export async function test_api_verified_expert_password_change_unauthenticated_401(
  connection: api.IConnection,
) {
  // 1) Build a valid-shaped request body (8-128 chars passwords)
  const body = {
    current_password: RandomGenerator.alphaNumeric(12),
    new_password: RandomGenerator.alphaNumeric(12),
  } satisfies IEconDiscussVerifiedExpertPassword.IUpdate;

  // 2) Create an unauthenticated connection without touching the original
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 3) Attempt the password update and expect an error (unauthenticated)
  await TestValidator.error(
    "unauthenticated verified expert password change must fail",
    async () => {
      await api.functional.auth.verifiedExpert.password.updatePassword(
        unauthConn,
        { body },
      );
    },
  );
}
