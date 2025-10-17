import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconDiscussAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussAdmin";

/**
 * Requesting a password reset with an existing admin email returns a neutral
 * acknowledgement.
 *
 * Business goal:
 *
 * - Ensure that the password reset initiation endpoint acknowledges the request
 *   without leaking whether the email exists or not.
 *
 * Test workflow:
 *
 * 1. Seed a real admin via join to obtain a valid, existing email.
 * 2. Call POST /auth/admin/password/reset/request with that email.
 * 3. Validate that a neutral security event is returned (no enumeration), and
 *    occurred_at is ISO 8601 (validated by typia.assert).
 *
 * Validation strategy:
 *
 * - Typia.assert() on responses for perfect DTO conformance.
 * - Business logic checks:
 *
 *   - Outcome is non-empty string
 *   - Message (if present) does not embed the submitted email
 *
 * Out of scope:
 *
 * - Status code checks and rate limiting.
 */
export async function test_api_admin_password_reset_request_existing_email_neutral_ack(
  connection: api.IConnection,
) {
  // 1) Seed a real admin via join
  const email = typia.random<string & tags.Format<"email">>();
  const password = `${RandomGenerator.alphaNumeric(12)}!`;
  const joinBody = {
    email,
    password,
    display_name: RandomGenerator.name(2),
    timezone: "Asia/Seoul",
    locale: "en-US",
  } satisfies IEconDiscussAdmin.ICreate;

  const authorized = await api.functional.auth.admin.join(connection, {
    body: joinBody,
  });
  typia.assert(authorized);

  // 2) Request password reset with the existing admin email
  const event =
    await api.functional.auth.admin.password.reset.request.requestPasswordReset(
      connection,
      {
        body: { email } satisfies IEconDiscussAdmin.IPasswordResetRequest,
      },
    );
  typia.assert(event);

  // 3) Business validations for neutral acknowledgement
  TestValidator.predicate(
    "security event has non-empty outcome",
    event.outcome.length > 0,
  );
  TestValidator.predicate(
    "security event message does not leak user email",
    (event.message ?? "").includes(email) === false,
  );
}
