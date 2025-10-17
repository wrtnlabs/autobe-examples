import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPortalMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalMember";

/**
 * Validate password-reset request behaviour for a non-existent email address.
 *
 * Business goal:
 *
 * - Ensure the API responds with a generic acknowledgement for password reset
 *   requests so as to prevent attackers from enumerating existing accounts.
 *
 * Notes:
 *
 * - The test environment may not expose user-creation or mailer hooks. Because
 *   the provided SDK functions do not include member creation endpoints, this
 *   test does NOT attempt to call an "existing-email" path. Instead it asserts
 *   that repeated requests for the same random (likely non-existent) email
 *   return consistent generic acknowledgements, which is a practical proxy for
 *   parity while remaining fully implementable with the available API.
 */
export async function test_api_member_request_password_reset_nonexistent_email(
  connection: api.IConnection,
) {
  // 1) Generate a clearly unique test email (randomized so tests don't collide)
  const testEmail = `${RandomGenerator.alphaNumeric(12)}-${Date.now()}@example.com`;

  // 2) Prepare request body using `satisfies` for strict typing
  const requestBody = {
    email: testEmail,
  } satisfies ICommunityPortalMember.IRequestPasswordReset;

  // 3) First call: initiate password reset for (likely) non-existent account
  const firstResponse: ICommunityPortalMember.IPasswordResetRequested =
    await api.functional.auth.member.password.request_reset.requestPasswordReset(
      connection,
      { body: requestBody },
    );
  typia.assert(firstResponse);

  // 4) The message must be a non-empty, user-facing acknowledgement string
  TestValidator.predicate(
    "password reset acknowledgement message is non-empty",
    typeof firstResponse.message === "string" &&
      firstResponse.message.length > 0,
  );

  // 5) Second call with the same email to assert consistent generic acknowledgement
  const secondResponse: ICommunityPortalMember.IPasswordResetRequested =
    await api.functional.auth.member.password.request_reset.requestPasswordReset(
      connection,
      { body: requestBody },
    );
  typia.assert(secondResponse);

  // 6) Business validation: messages should be identical (generic parity)
  TestValidator.equals(
    "repeated requests return identical acknowledgement messages",
    firstResponse.message,
    secondResponse.message,
  );

  // 7) If request_id is present, ensure parity as well (both undefined/null or identical)
  TestValidator.equals(
    "repeated requests have same request_id parity",
    firstResponse.request_id ?? null,
    secondResponse.request_id ?? null,
  );
}
