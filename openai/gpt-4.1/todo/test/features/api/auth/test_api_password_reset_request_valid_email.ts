import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validates the password reset request flow for a registered, eligible user.
 *
 * This test ensures that when a user submits a password reset request with an
 * eligible, registered email address:
 *
 * 1. The API accepts the request without leaking whether the email is actually
 *    registered or eligible.
 * 2. A reset token is generated internally and a notification is sent (side-effect
 *    cannot be directly verified).
 * 3. The response always returns { success: true } regardless of account
 *    presence/eligibility, as mandated by security policies.
 * 4. Multiple requests to the same endpoint with the same email receive identical
 *    generic responses (tests rate-limiting and generic messaging
 *    consistency).
 *
 * Steps:
 *
 * 1. Generate a random but syntactically valid email with typia.random.
 * 2. Call the API with this email to request password reset.
 * 3. Assert the response structure and that success is true.
 * 4. Repeat the request with the same email and assert the same response (verifies
 *    idempotency and message consistency).
 * 5. Optionally, call with a different valid email and assert the same generic
 *    response for non-leakage principles.
 *
 * Notes:
 *
 * - This test cannot validate out-of-band effects (mail sent, token generated)
 *   due to security compliance.
 * - Instead, it validates the generic response contract and public-facing API
 *   behavior.
 */
export async function test_api_password_reset_request_valid_email(
  connection: api.IConnection,
) {
  // 1. Generate a valid email address
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  // 2. Submit password reset request
  const body = { email } satisfies ITodoListUser.IResetPasswordRequest;
  const output1 =
    await api.functional.auth.user.password.reset.request.requestPasswordReset(
      connection,
      { body },
    );
  typia.assert(output1);
  TestValidator.equals(
    "generic password reset response must always be success:true",
    output1.success,
    true,
  );

  // 3. Resubmit with same email (should receive generic response, tests idempotency/rate limiting surface)
  const output2 =
    await api.functional.auth.user.password.reset.request.requestPasswordReset(
      connection,
      { body },
    );
  typia.assert(output2);
  TestValidator.equals(
    "repeated request receives identical response for security",
    output2.success,
    true,
  );

  // 4. Submit with a different valid email (presumably unregistered, still receives generic response)
  const differentEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const differentBody = {
    email: differentEmail,
  } satisfies ITodoListUser.IResetPasswordRequest;
  const output3 =
    await api.functional.auth.user.password.reset.request.requestPasswordReset(
      connection,
      { body: differentBody },
    );
  typia.assert(output3);
  TestValidator.equals(
    "generic response for any email for non-enumeration",
    output3.success,
    true,
  );
}
