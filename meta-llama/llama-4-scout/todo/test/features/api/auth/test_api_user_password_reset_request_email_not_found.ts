import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserPasswordReset";

/**
 * Validates password reset request behavior for a non-existent email.
 *
 * Tests the endpoint '/auth/user/request-password-reset' to ensure that
 * submitting a password reset request for an email address that does not
 * correspond to any existing user returns the same generic confirmation message
 * as for a valid user. This prevents leaking account existence and aligns with
 * security and privacy requirements.
 *
 * Steps:
 *
 * 1. Generate a random email assumed not to exist in the system.
 * 2. Submit a password reset request for that email.
 * 3. Assert the response is of the correct type and contains a generic
 *    confirmation message.
 * 4. (Optionally) Validate message contents are generic and do not reveal user
 *    presence.
 */
export async function test_api_user_password_reset_request_email_not_found(
  connection: api.IConnection,
) {
  // 1. Generate a random email that is extremely unlikely to exist (used only for this test)
  const nonExistingEmail: string & tags.Format<"email"> =
    `${RandomGenerator.alphaNumeric(16)}_${Date.now()}@example-nonexistent.com` as string &
      tags.Format<"email">;

  // 2. Submit password reset request for the non-existent email
  const response: ITodoListUserPasswordReset.IRequested =
    await api.functional.auth.user.request_password_reset.requestPasswordReset(
      connection,
      {
        body: {
          email: nonExistingEmail,
        } satisfies ITodoListUserPasswordReset.IRequest,
      },
    );
  typia.assert(response);
  // 3. Assert the message is present and is a generic confirmation, not indicating account existence
  TestValidator.predicate(
    "generic message present in password reset response for unknown email",
    typeof response.message === "string" &&
      response.message.toLowerCase().includes("if") &&
      response.message.toLowerCase().includes("reset"),
  );
}
