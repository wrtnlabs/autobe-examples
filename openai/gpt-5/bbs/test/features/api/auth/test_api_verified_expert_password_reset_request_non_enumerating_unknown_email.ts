import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IEconDiscussVerifiedExpertPassword } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVerifiedExpertPassword";

/**
 * Ensure password reset request does not enumerate unknown emails.
 *
 * Business goal:
 *
 * - The POST /auth/verifiedExpert/password/forgot endpoint must behave
 *   generically (no disclosure of account existence) whether or not the
 *   submitted email exists.
 *
 * What this test verifies:
 *
 * 1. Submitting a random, likely non-existent email succeeds without error.
 * 2. Submitting the same unknown email again also succeeds (idempotent/generic
 *    behavior).
 * 3. Submitting a different unknown email also succeeds, demonstrating consistent
 *    generic behavior across inputs.
 *
 * Notes:
 *
 * - The SDK function returns void; there is no response content to assert.
 * - No mail-sink or token inspection API is provided, so we only assert that the
 *   operations complete without throwing errors.
 * - This endpoint is public; do not manipulate connection.headers.
 */
export async function test_api_verified_expert_password_reset_request_non_enumerating_unknown_email(
  connection: api.IConnection,
) {
  // Generate two random, likely non-existent emails
  const unknownEmail1 = typia.random<string & tags.Format<"email">>();
  const unknownEmail2 = typia.random<string & tags.Format<"email">>();

  // 1) First request with unknownEmail1 must not throw
  await TestValidator.predicate(
    "first reset request for an unknown email is accepted generically",
    async () => {
      try {
        await api.functional.auth.verifiedExpert.password.forgot.requestPasswordReset(
          connection,
          {
            body: {
              email: unknownEmail1,
              locale: "en-US",
            } satisfies IEconDiscussVerifiedExpertPassword.IRequest,
          },
        );
        return true;
      } catch {
        return false;
      }
    },
  );

  // 2) Second request with the same unknownEmail1 should also not throw (idempotent/generic)
  await TestValidator.predicate(
    "second reset request for the same unknown email remains generic and succeeds",
    async () => {
      try {
        await api.functional.auth.verifiedExpert.password.forgot.requestPasswordReset(
          connection,
          {
            body: {
              email: unknownEmail1,
              locale: "en-US",
            } satisfies IEconDiscussVerifiedExpertPassword.IRequest,
          },
        );
        return true;
      } catch {
        return false;
      }
    },
  );

  // 3) Request with a different unknown email should also not throw
  await TestValidator.predicate(
    "reset request for a different unknown email is also accepted generically",
    async () => {
      try {
        await api.functional.auth.verifiedExpert.password.forgot.requestPasswordReset(
          connection,
          {
            body: {
              email: unknownEmail2,
              locale: "en-US",
            } satisfies IEconDiscussVerifiedExpertPassword.IRequest,
          },
        );
        return true;
      } catch {
        return false;
      }
    },
  );
}
