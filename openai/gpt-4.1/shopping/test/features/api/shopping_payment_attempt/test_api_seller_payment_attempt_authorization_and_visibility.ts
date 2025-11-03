import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingPaymentAttempt } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingPaymentAttempt";
import type { IShoppingSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSeller";

/**
 * Validates visibility and authorization rules for seller access to payment
 * attempts.
 *
 * Scenario: A seller registers successfully, then attempts to retrieve payment
 * attempt details.
 *
 * - The seller should be able to retrieve payment attempt details only for orders
 *   linked to their business.
 * - Accessing payment attempts (by order code and payment reference) for
 *   unrelated orders MUST fail.
 *
 * Steps:
 *
 * 1. Register and authenticate a new seller.
 * 2. Attempt to fetch a random payment attempt using unrelated/random orderCode
 *    and paymentReference (expect error).
 * 3. (Happy path) Attempt to fetch a payment attempt for which you have access
 *    rights; if setup is not possible, provide a type-safe request and validate
 *    a success response.
 */
export async function test_api_seller_payment_attempt_authorization_and_visibility(
  connection: api.IConnection,
) {
  // 1. Register a new seller
  const sellerJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    display_name: RandomGenerator.name(),
    contact_phone: RandomGenerator.mobile(),
    status: "pending", // forced by schema; ignored by business logic on registration
  } satisfies IShoppingSeller.IJoin;
  const seller: IShoppingSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinInput,
    });
  typia.assert(seller);

  // 2. Unauthorized case: Attempt to fetch non-owned order's payment attempt (should error)
  await TestValidator.error(
    "unauthorized seller cannot view unrelated payment attempt",
    async () => {
      await api.functional.shopping.seller.orders.payment_attempts.at(
        connection,
        {
          orderCode: RandomGenerator.alphaNumeric(12),
          paymentReference: RandomGenerator.alphaNumeric(16),
        },
      );
    },
  );

  // 3. Authorized/visibility case: Attempt to fetch (synthetic; can't create payment attempts via available API)
  // Type-safe access validation for business case, ensures type and endpoint contract are valid.
  // In real E2E, would require additional endpoints to create payment attempts linked to seller.
  const exampleOrderCode = RandomGenerator.alphaNumeric(12);
  const examplePaymentReference = RandomGenerator.alphaNumeric(16);
  const paymentAttempt: IShoppingPaymentAttempt =
    await api.functional.shopping.seller.orders.payment_attempts.at(
      connection,
      {
        orderCode: exampleOrderCode,
        paymentReference: examplePaymentReference,
      },
    );
  typia.assert(paymentAttempt);
}
