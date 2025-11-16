import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";

/**
 * Validate customer password reset request behavior for a verified customer.
 *
 * Business intent:
 *
 * - A real customer joins the shopping mall, obtaining valid auth credentials.
 * - The same customer initiates a password reset using their login email.
 * - The password reset endpoint must:
 *
 *   - Return a generic acknowledgement (IRequestPasswordResetResult) without
 *       leaking account existence, tokens, or session info.
 *   - NOT return an authorization envelope or JWT tokens.
 *   - Behave idempotently when called multiple times for the same email.
 *
 * What we can verify in this black-box test (no DB/admin inspection APIs):
 *
 * 1. Join():
 *
 *    - Accepts an IJoin payload with realistic values.
 *    - Returns IShoppingMallCustomer.IAuthorized (validated via typia.assert).
 * 2. RequestPasswordReset():
 *
 *    - Accepts IRequestPasswordReset with the same email.
 *    - Returns IRequestPasswordResetResult with status in {"accepted","processed"}.
 *    - Does not include fields from IShoppingMallCustomer.IAuthorized (like token or
 *         customer) in the response, which is enforced by typia.assert.
 * 3. Idempotency & non-enumeration:
 *
 *    - A second call with the same email returns another IRequestPasswordResetResult
 *         with similarly generic status.
 */
export async function test_api_customer_password_reset_request_for_verified_customer(
  connection: api.IConnection,
) {
  // 1. Arrange: create a real customer via join() so we have a valid email/credentials
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const joinBody = {
    email,
    password: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(),
    // ip is optional; omit to let backend infer from connection
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const authorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(authorized);

  // Sanity-check join response basic invariants (business-level expectations)
  TestValidator.equals(
    "joined customer's email matches join payload",
    authorized.email,
    email,
  );

  // 2. Act: call password reset request endpoint with the same email
  const resetRequestBody = {
    email,
  } satisfies IShoppingMallCustomerAuth.IRequestPasswordReset;

  const firstResetResult: IShoppingMallCustomerAuth.IRequestPasswordResetResult =
    await api.functional.auth.customer.password.reset.request.requestPasswordReset(
      connection,
      {
        body: resetRequestBody,
      },
    );
  typia.assert<IShoppingMallCustomerAuth.IRequestPasswordResetResult>(
    firstResetResult,
  );

  // 3. Assert: verify status is generic and non-leaking at the contract level
  TestValidator.predicate(
    "first password reset request has generic accepted/processed status",
    firstResetResult.status === "accepted" ||
      firstResetResult.status === "processed",
  );

  // 4. Idempotency & non-enumeration: call password reset again with same email
  const secondResetResult: IShoppingMallCustomerAuth.IRequestPasswordResetResult =
    await api.functional.auth.customer.password.reset.request.requestPasswordReset(
      connection,
      {
        body: resetRequestBody,
      },
    );
  typia.assert<IShoppingMallCustomerAuth.IRequestPasswordResetResult>(
    secondResetResult,
  );

  TestValidator.predicate(
    "second password reset request also has generic accepted/processed status",
    secondResetResult.status === "accepted" ||
      secondResetResult.status === "processed",
  );

  // Optional: the two responses may or may not be identical depending on
  // implementation (e.g., different messages). We only expect type & contract
  // stability. When messages are present, they should be non-enumerating; we
  // just assert they are strings if provided.
  if (
    firstResetResult.message !== undefined &&
    firstResetResult.message !== null
  ) {
    TestValidator.predicate(
      "first reset message, when present, is non-empty string",
      typeof firstResetResult.message === "string" &&
        firstResetResult.message.length > 0,
    );
  }
  if (
    secondResetResult.message !== undefined &&
    secondResetResult.message !== null
  ) {
    TestValidator.predicate(
      "second reset message, when present, is non-empty string",
      typeof secondResetResult.message === "string" &&
        secondResetResult.message.length > 0,
    );
  }
}
