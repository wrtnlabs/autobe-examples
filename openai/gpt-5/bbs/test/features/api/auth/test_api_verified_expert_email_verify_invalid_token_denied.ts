import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IEconDiscussVerifiedExpertEmail } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVerifiedExpertEmail";
import type { IEconDiscussVerifiedExpertEmailVerify } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVerifiedExpertEmailVerify";

export async function test_api_verified_expert_email_verify_invalid_token_denied(
  connection: api.IConnection,
) {
  /**
   * Deny invalid verified-expert email verification tokens.
   *
   * Purpose
   *
   * - Ensure that POST /auth/verifiedExpert/email/verify rejects
   *   invalid/malformed tokens and does not alter any account state.
   *
   * Steps
   *
   * 1. Attempt verification with an obviously fabricated token (string type, but
   *    invalid semantics).
   * 2. Repeat the same invalid token again to validate consistent rejection
   *    (idempotent denial).
   * 3. Try a different invalid token to ensure denial remains consistent.
   *
   * Notes
   *
   * - No authentication or user creation is required here (public endpoint,
   *   invalid token path).
   * - Do not assert specific HTTP status codes; only assert that an error is
   *   thrown.
   */
  const invalidToken: string = RandomGenerator.alphaNumeric(48);
  const anotherInvalidToken: string = RandomGenerator.alphaNumeric(48);

  // 1) First attempt with invalid token → must be rejected
  await TestValidator.error("invalid token should be rejected", async () => {
    await api.functional.auth.verifiedExpert.email.verify.verifyEmail(
      connection,
      {
        body: {
          token: invalidToken,
        } satisfies IEconDiscussVerifiedExpertEmailVerify.ICreate,
      },
    );
  });

  // 2) Repeat same invalid token → must still be rejected (idempotent denial)
  await TestValidator.error(
    "repeating same invalid token remains rejected",
    async () => {
      await api.functional.auth.verifiedExpert.email.verify.verifyEmail(
        connection,
        {
          body: {
            token: invalidToken,
          } satisfies IEconDiscussVerifiedExpertEmailVerify.ICreate,
        },
      );
    },
  );

  // 3) Different invalid token → still rejected
  await TestValidator.error(
    "different invalid token should also be rejected",
    async () => {
      await api.functional.auth.verifiedExpert.email.verify.verifyEmail(
        connection,
        {
          body: {
            token: anotherInvalidToken,
          } satisfies IEconDiscussVerifiedExpertEmailVerify.ICreate,
        },
      );
    },
  );
}
