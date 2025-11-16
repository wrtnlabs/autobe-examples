import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";

/**
 * Validate password reset request behavior for unknown customer emails.
 *
 * Business goal
 *
 * - Ensure that when a password reset is requested for an email address that is
 *   not associated with any customer credentials, the API still returns a
 *   generic acknowledgement without leaking whether the account exists.
 *
 * What this test covers
 *
 * 1. Send POST /auth/customer/password/reset/request with a random, syntactically
 *    valid email that has not been used to create a customer in this test.
 * 2. Verify that the API responds successfully with
 *    IShoppingMallCustomerAuth.IRequestPasswordResetResult.
 * 3. Ensure the `status` field is one of the allowed generic values ("accepted" |
 *    "processed").
 * 4. Ensure the `message` field, if present, is generic and does not directly echo
 *    the submitted email address (a simple non-enumeration sanity check).
 */
export async function test_api_customer_password_reset_request_for_unknown_email(
  connection: api.IConnection,
) {
  // 1. Prepare a syntactically valid, random email address
  const unknownEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  // 2. Build request body satisfying IRequestPasswordReset
  const body = {
    email: unknownEmail,
  } satisfies IShoppingMallCustomerAuth.IRequestPasswordReset;

  // 3. Call the password reset request endpoint
  const result: IShoppingMallCustomerAuth.IRequestPasswordResetResult =
    await api.functional.auth.customer.password.reset.request.requestPasswordReset(
      connection,
      { body },
    );

  // 4. Assert structural type correctness
  typia.assert<IShoppingMallCustomerAuth.IRequestPasswordResetResult>(result);

  // 5a. status must be one of the allowed generic values
  TestValidator.predicate(
    "password reset request status should be accepted or processed",
    result.status === "accepted" || result.status === "processed",
  );

  // 5b. message, if present, must be a generic string and should not echo the email back
  if (result.message !== undefined) {
    const message = result.message;

    TestValidator.predicate(
      "password reset request message should be a non-empty string when present",
      message.length > 0,
    );

    TestValidator.predicate(
      "password reset message must not directly contain the submitted email (avoid enumeration leak)",
      message.includes(unknownEmail) === false,
    );
  }
}
