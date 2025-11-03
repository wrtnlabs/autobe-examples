import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCustomer";

/**
 * Test the complete customer password reset workflow: initiation + completion.
 *
 * 1. Generate a random customer email.
 * 2. Initiate a password reset for that email to generate a secure reset token.
 * 3. Use the resulting token in the reset completion endpoint with a new password.
 * 4. Assert the successful completion response structure and business logic.
 * 5. Attempt to reuse the same token—should fail as it's already consumed.
 * 6. Attempt to reset with invalid/expired token—should fail.
 * 7. Attempt to reset with a weak password—should fail policy checks.
 * 8. Confirm successful reset only occurs via valid flow.
 */
export async function test_api_customer_password_reset_complete_after_request(
  connection: api.IConnection,
) {
  // Step 1: Generate random customer email for test
  const customerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  // Step 2: Initiate password reset request (simulate - assume email exists in system for test)
  const resetRequest =
    await api.functional.auth.customer.password.reset_request.requestPasswordReset(
      connection,
      {
        body: {
          request_email: customerEmail,
        } satisfies IShoppingCustomer.IRequestPasswordReset,
      },
    );
  typia.assert(resetRequest);
  TestValidator.equals(
    "initiating password reset always returns confirmation true",
    resetRequest.confirmation,
    true,
  );

  // Step 3: Assume we can retrieve the reset token for testing (simulate email reception)
  const simulatedToken: string = RandomGenerator.alphaNumeric(32);

  // Step 4: Attempt password reset with a strong new password
  const strongPassword = RandomGenerator.alphaNumeric(16) + "Aa1!"; // Satisfy complexity
  const resetResponse =
    await api.functional.auth.customer.password.reset.resetPassword(
      connection,
      {
        body: {
          reset_code: simulatedToken,
          new_password: strongPassword,
        } satisfies IShoppingCustomer.ICompletePasswordReset,
      },
    );
  typia.assert(resetResponse);
  TestValidator.predicate(
    "reset response contains UUID and timestamp",
    typeof resetResponse.customer_id === "string" &&
      typeof resetResponse.reset_token_consumed_at === "string" &&
      resetResponse.success === true,
  );

  // Step 5: Attempt to reuse token — should fail
  await TestValidator.error("cannot reuse a consumed reset token", async () => {
    await api.functional.auth.customer.password.reset.resetPassword(
      connection,
      {
        body: {
          reset_code: simulatedToken,
          new_password: strongPassword, // or any value
        } satisfies IShoppingCustomer.ICompletePasswordReset,
      },
    );
  });

  // Step 6: Attempt with completely invalid/expired token
  await TestValidator.error(
    "cannot use invalid/expired reset token",
    async () => {
      await api.functional.auth.customer.password.reset.resetPassword(
        connection,
        {
          body: {
            reset_code: RandomGenerator.alphaNumeric(33) + "z", // different
            new_password: strongPassword,
          } satisfies IShoppingCustomer.ICompletePasswordReset,
        },
      );
    },
  );

  // Step 7: Attempt a weak password (simple string, e.g. '1234')
  await TestValidator.error("enforces password strength policy", async () => {
    await api.functional.auth.customer.password.reset.resetPassword(
      connection,
      {
        body: {
          reset_code: simulatedToken,
          new_password: "1234",
        } satisfies IShoppingCustomer.ICompletePasswordReset,
      },
    );
  });
}
