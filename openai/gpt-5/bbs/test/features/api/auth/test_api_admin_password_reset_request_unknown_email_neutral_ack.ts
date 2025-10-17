import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IEconDiscussAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussAdmin";

export async function test_api_admin_password_reset_request_unknown_email_neutral_ack(
  connection: api.IConnection,
) {
  /**
   * Validate neutral acknowledgement for unknown admin email password reset
   * request.
   *
   * Steps:
   *
   * 1. Use unauthenticated connection
   * 2. Submit reset request with a synthetic, likely non-existent email
   * 3. Assert response type and that no sensitive information is echoed
   * 4. Repeat with a different unknown email to ensure consistent neutrality
   */

  // 1) Unauthenticated connection: create fresh headers object and do not touch it further
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // Helper to execute one request and perform assertions
  const execute = async (email: string) => {
    const body = { email } satisfies IEconDiscussAdmin.IPasswordResetRequest;

    const ack: IEconDiscussAdmin.ISecurityEvent =
      await api.functional.auth.admin.password.reset.request.requestPasswordReset(
        unauthConn,
        { body },
      );

    // Type-level validation including occurred_at date-time format
    typia.assert(ack);

    // Business neutrality: the response must not echo the submitted email
    TestValidator.predicate(
      "outcome must not echo submitted email",
      ack.outcome.includes(email) === false,
    );
    if (ack.message !== undefined) {
      TestValidator.predicate(
        "message must not echo submitted email",
        ack.message.includes(email) === false,
      );
    }

    return ack;
  };

  // 2) Submit with a clearly synthetic unknown email (valid format, non-existent domain)
  const email1 = `${RandomGenerator.alphabets(12)}+reset@e2e.invalid`;
  await execute(email1);

  // 4) Repeat with a different email to confirm consistent neutrality
  const email2 = `${RandomGenerator.alphabets(12)}+reset@e2e.invalid`;
  await execute(email2);
}
