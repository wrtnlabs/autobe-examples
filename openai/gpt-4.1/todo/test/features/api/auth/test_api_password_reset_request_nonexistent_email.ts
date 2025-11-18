import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Verifies password reset request returns a generic response for non-existent
 * emails.
 *
 * This test checks that attempting to initiate a password reset for an email
 * address that does not exist in the system always results in the same generic
 * response as for a legitimate, eligible user. This prevents attackers from
 * using this endpoint to enumerate accounts or infer account status, protecting
 * user privacy.
 *
 * Steps:
 *
 * 1. Generate a random email address that should not exist in the system.
 * 2. Submit a password reset request to /auth/user/password/reset/request with
 *    that email.
 * 3. Assert that the response has success: true and matches the generic result
 *    shape.
 * 4. Optionally, compare the response to a submission for a different non-existent
 *    email to confirm consistency.
 */
export async function test_api_password_reset_request_nonexistent_email(
  connection: api.IConnection,
) {
  // 1. Generate a random email address that should not exist
  const nonExistentEmail = `${RandomGenerator.alphabets(10)}-no-user@notfound.test`;

  // 2. Submit password reset request for the non-existent email
  const result: ITodoListUser.IResetPasswordRequestResult =
    await api.functional.auth.user.password.reset.request.requestPasswordReset(
      connection,
      {
        body: {
          email: nonExistentEmail satisfies string & tags.Format<"email">,
        } satisfies ITodoListUser.IResetPasswordRequest,
      },
    );

  // 3. Assert that response is generic success
  typia.assert(result);
  TestValidator.equals(
    "returns generic success for non-existent email",
    result.success,
    true,
  );

  // 4. Optionally, repeat for a second random email and check consistency
  const anotherNonExistentEmail = `${RandomGenerator.alphabets(10)}-missing@notfound.test`;
  const result2: ITodoListUser.IResetPasswordRequestResult =
    await api.functional.auth.user.password.reset.request.requestPasswordReset(
      connection,
      {
        body: {
          email: anotherNonExistentEmail satisfies string &
            tags.Format<"email">,
        } satisfies ITodoListUser.IResetPasswordRequest,
      },
    );

  typia.assert(result2);
  TestValidator.equals(
    "returns generic success for another non-existent email",
    result2.success,
    true,
  );

  // 5. Both responses are identical (as per privacy requirements)
  TestValidator.equals(
    "response shapes for unrelated emails are identical",
    result,
    result2,
  );
}
