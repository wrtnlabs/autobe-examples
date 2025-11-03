import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICivicBoardPasswordResetToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICivicBoardPasswordResetToken";
import type { ICivicBoardPasswordResetTokenOfAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICivicBoardPasswordResetTokenOfAdmin";

/**
 * Validate privacy-preserving acknowledgement for non-existent admin email
 * password reset requests.
 *
 * Business goal
 *
 * - Ensure that requesting a password reset for an admin email that does not
 *   exist returns a generic acknowledgement without revealing account
 *   existence.
 * - Verify consistent uniform responses across repeated attempts with the same
 *   email.
 *
 * Steps
 *
 * 1. Generate a random admin email (assumed unissued in the system).
 * 2. Call POST /auth/admin/password/reset/request with that email.
 * 3. Validate the response structure (typia.assert) and business rule
 *    (acknowledged === true).
 * 4. Repeat the request with the same email and confirm acknowledgements are
 *    consistent.
 */
export async function test_api_admin_password_reset_request_nonexistent_email_privacy_acknowledgement(
  connection: api.IConnection,
) {
  // 1) Generate a unique, likely non-existent admin email
  const email = typia.random<string & tags.Format<"email">>();

  // 2) First request
  const first: ICivicBoardPasswordResetToken.ISummary =
    await api.functional.auth.admin.password.reset.request.requestPasswordReset(
      connection,
      {
        body: { email } satisfies ICivicBoardPasswordResetTokenOfAdmin.ICreate,
      },
    );
  // Validate response type (ensures no sensitive leakage beyond ISummary contract)
  typia.assert(first);
  // Business logic: acknowledged should be true regardless of account existence
  TestValidator.equals("first request acknowledged", first.acknowledged, true);

  // 3) Repeat the same request to confirm uniform behavior
  const second: ICivicBoardPasswordResetToken.ISummary =
    await api.functional.auth.admin.password.reset.request.requestPasswordReset(
      connection,
      {
        body: { email } satisfies ICivicBoardPasswordResetTokenOfAdmin.ICreate,
      },
    );
  typia.assert(second);
  TestValidator.equals(
    "repeat request acknowledged remains true",
    second.acknowledged,
    true,
  );

  // 4) Consistency check across attempts (do not bind to expires_at presence/value)
  TestValidator.equals(
    "consistent acknowledgement across attempts",
    second.acknowledged,
    first.acknowledged,
  );
}
