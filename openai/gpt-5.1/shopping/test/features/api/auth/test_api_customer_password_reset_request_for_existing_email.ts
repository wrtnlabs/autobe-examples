import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";

/**
 * Verify password reset request acknowledgement for an existing customer email.
 *
 * Business purpose:
 *
 * - Ensure that when a real, registered customer requests a password reset, the
 *   system accepts the request and responds with a minimal, generic
 *   acknowledgement.
 * - Confirm that the response conforms to
 *   IShoppingMallCustomerAuth.IRequestPasswordResetResult and does not leak any
 *   information that could be used for account enumeration or token theft.
 *
 * Scenario steps:
 *
 * 1. Register a new customer with POST /auth/customer/join using a unique email.
 * 2. Request a password reset with POST /auth/customer/password/reset/request
 *    using the same email.
 * 3. Assert that the response is a valid
 *    IShoppingMallCustomerAuth.IRequestPasswordResetResult with a status of
 *    either "accepted" or "processed".
 * 4. Verify that the optional message field does not expose the raw email address
 *    or any explicit existence information.
 */
export async function test_api_customer_password_reset_request_for_existing_email(
  connection: api.IConnection,
) {
  // 1. Register a new customer (join)
  const joinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    // Use null for ip to let backend infer from transport context
    ip: null,
    href: `https://shop.example.com/signup/${RandomGenerator.alphaNumeric(6)}`,
    referrer: `https://shop.example.com/landing/${RandomGenerator.alphaNumeric(6)}`,
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const authorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(authorized);

  // 2. Request password reset for the same email
  const resetRequestBody = {
    email: joinBody.email,
  } satisfies IShoppingMallCustomerAuth.IRequestPasswordReset;

  const resetResult: IShoppingMallCustomerAuth.IRequestPasswordResetResult =
    await api.functional.auth.customer.password.reset.request.requestPasswordReset(
      connection,
      {
        body: resetRequestBody,
      },
    );
  typia.assert<IShoppingMallCustomerAuth.IRequestPasswordResetResult>(
    resetResult,
  );

  // 3. Validate generic, non-enumerating acknowledgement semantics
  // 3-1. Status must be one of the allowed literals (already enforced by type,
  //      but we assert for business clarity and future-proofing)
  TestValidator.predicate(
    "password reset request status is accepted or processed",
    resetResult.status === "accepted" || resetResult.status === "processed",
  );

  // 3-2. If message is present, it should be a non-empty string and should not
  //      contain the raw email – to avoid leaking whether the email exists.
  if (resetResult.message !== undefined) {
    TestValidator.predicate(
      "password reset acknowledgement message is non-empty when present",
      resetResult.message.length > 0,
    );

    TestValidator.predicate(
      "password reset message does not echo the customer email",
      resetResult.message.includes(joinBody.email) === false,
    );

    // Also check that it does not contain overly explicit existence hints.
    const lower = resetResult.message.toLowerCase();
    TestValidator.predicate(
      "password reset message does not explicitly confirm account existence",
      lower.includes("does not exist") === false &&
        lower.includes("no account") === false &&
        lower.includes("unknown email") === false,
    );
  }
}
