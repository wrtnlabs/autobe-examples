import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";

/**
 * Validate customer password reset request acknowledgement behavior.
 *
 * This scenario adapts the original "disabled or blocked account" requirement
 * to what is actually observable through the public SDK. We cannot change a
 * customer’s credential status or inspect internal password reset tokens or
 * auth logs, so the test focuses on verifying that the password reset request
 * endpoint behaves as a generic, non‑revealing acknowledgement flow for an
 * existing customer email.
 *
 * Business flow:
 *
 * 1. Register a new customer via /auth/customer/join to obtain a valid email and
 *    ensure a corresponding credentials record exists.
 * 2. Call /auth/customer/password/reset/request with that email to simulate a
 *    password reset request. This endpoint should:
 *
 *    - Accept the request regardless of caller authentication context.
 *    - Return a generic IShoppingMallCustomerAuth.IRequestPasswordResetResult that
 *         does not expose whether the account exists or its status.
 *    - Never issue an IShoppingMallCustomer.IAuthorized envelope or
 *         IAuthorizationToken.
 * 3. Call the password reset endpoint multiple times for the same email to confirm
 *    that repeated requests still return a valid generic acknowledgement
 *    payload.
 * 4. Validate only what is observable from the contract:
 *
 *    - Typia.assert() passes for each response
 *    - Status is one of the allowed enum values ("accepted" | "processed")
 *    - If message is present, it is a non‑empty string
 *
 * Internal behaviors such as updating shopping_mall_auth_credentials status,
 * inserting shopping_mall_password_reset_tokens, or writing to
 * shopping_mall_auth_logs are intentionally not tested, as they are not exposed
 * via the public SDK. The key assertion is that the endpoint remains a generic
 * acknowledgement surface and does not accidentally become an authorization or
 * identity‑issuing flow.
 */
export async function test_api_customer_password_reset_request_for_disabled_or_blocked_account(
  connection: api.IConnection,
) {
  // 1. Register a new customer to obtain a valid email
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    ip: null,
    href: "https://customer.example.com/signup",
    referrer: "https://customer.example.com/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const authorizedCustomer = await api.functional.auth.customer.join(
    connection,
    {
      body: joinBody,
    },
  );
  typia.assert<IShoppingMallCustomer.IAuthorized>(authorizedCustomer);

  // 2. Issue a password reset request for the newly registered email
  const resetRequestBody = {
    email: joinBody.email,
  } satisfies IShoppingMallCustomerAuth.IRequestPasswordReset;

  const firstResetResult =
    await api.functional.auth.customer.password.reset.request.requestPasswordReset(
      connection,
      { body: resetRequestBody },
    );
  typia.assert<IShoppingMallCustomerAuth.IRequestPasswordResetResult>(
    firstResetResult,
  );

  // Business assertions: status enum and optional message semantics
  TestValidator.predicate(
    "first password reset status is accepted or processed",
    firstResetResult.status === "accepted" ||
      firstResetResult.status === "processed",
  );

  if (firstResetResult.message !== undefined) {
    TestValidator.predicate(
      "first password reset message, when present, is non-empty",
      firstResetResult.message.length > 0,
    );
  }

  // 3. Call password reset again for the same email to ensure idempotent, generic behavior
  const secondResetResult =
    await api.functional.auth.customer.password.reset.request.requestPasswordReset(
      connection,
      { body: resetRequestBody },
    );
  typia.assert<IShoppingMallCustomerAuth.IRequestPasswordResetResult>(
    secondResetResult,
  );

  TestValidator.predicate(
    "second password reset status is accepted or processed",
    secondResetResult.status === "accepted" ||
      secondResetResult.status === "processed",
  );

  if (secondResetResult.message !== undefined) {
    TestValidator.predicate(
      "second password reset message, when present, is non-empty",
      secondResetResult.message.length > 0,
    );
  }
}
