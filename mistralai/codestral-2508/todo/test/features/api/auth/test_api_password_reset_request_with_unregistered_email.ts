import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test password reset request with an unregistered email address.
 *
 * This test ensures that the password reset endpoint never reveals whether an
 * email is registered. It verifies that any request using a non-existent email
 * yields a generic success response and no information about the existence of
 * the user is leaked. It also validates strict email format checks.
 *
 * Steps:
 *
 * 1. Generate a random, valid email that is guaranteed to NOT be in the user
 *    database.
 * 2. Request a password reset with this email using the proper API endpoint.
 * 3. Assert that the response is a generic success response (success true or false
 *    is acceptable, but error messages should not reference account
 *    existence).
 * 4. Validate the output structure/type using typia.assert.
 * 5. Check that status message does not violate privacy rules.
 * 6. Try an obviously invalid email format and ensure the API rejects it with an
 *    error.
 */
export async function test_api_password_reset_request_with_unregistered_email(
  connection: api.IConnection,
) {
  // 1. Generate a random, valid email address
  const unregisteredEmail =
    `unreg+${RandomGenerator.alphaNumeric(10)}@domain.test` as string &
      tags.Format<"email">;
  const requestBody = {
    email: unregisteredEmail,
  } satisfies ITodoListUser.IRequestPasswordReset;

  // 2. Call password reset endpoint with unregistered email
  const output =
    await api.functional.auth.user.password.request_reset.requestPasswordReset(
      connection,
      { body: requestBody },
    );

  // 3. Assert output has correct type/structure
  typia.assert<ITodoListUser.IPasswordResetStatus>(output);

  // 4. The response should not leak whether account exists
  // (Generic message, not e.g. "no user found" or similar)
  TestValidator.predicate(
    "status message reveals no account existence",
    typeof output.message === "string" &&
      !/not\s*found|not\s*exist|unknown user|no user/i.test(output.message),
  );

  // 5. The success property must be boolean
  TestValidator.predicate(
    "output.success is boolean",
    typeof output.success === "boolean",
  );

  // 6. Try invalid email format (should error)
  await TestValidator.error(
    "invalid email format should be rejected",
    async () => {
      await api.functional.auth.user.password.request_reset.requestPasswordReset(
        connection,
        { body: { email: "not-an-email" as string & tags.Format<"email"> } },
      );
    },
  );
}
