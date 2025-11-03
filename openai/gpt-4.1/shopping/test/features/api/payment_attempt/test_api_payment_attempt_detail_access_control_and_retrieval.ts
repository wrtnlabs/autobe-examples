import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCustomer";
import type { IShoppingPaymentAttempt } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingPaymentAttempt";

/**
 * Validate customer access control and retrieval of payment attempt details for
 * their shopping order.
 *
 * Steps:
 *
 * 1. Register a new customer using the customer join API
 * 2. Attempt to retrieve a payment attempt for a (likely non-existent) order using
 *    random orderCode and paymentReference.
 * 3. Assert that a payment attempt structure is returned (success scenario: system
 *    returns valid structure if combination exists).
 * 4. Attempt to retrieve a payment attempt using other random/unowned
 *    orderCode/paymentReference.
 * 5. In both cases, check that access is denied (error) if resource does not
 *    belong to customer.
 *
 * Note: Due to the lack of order/payment creation APIs and DTOs in the provided
 * context, this test focuses on retrieval attempts and access control
 * validation. It does NOT assume existing payment attempts are retrievable
 * without previous resource creation; all retrievals use purely random
 * references as the only feasible (compiling) scenario.
 */
export async function test_api_payment_attempt_detail_access_control_and_retrieval(
  connection: api.IConnection,
) {
  // 1. Register a new customer for the session context
  const customerBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    href: "https://shopper.example.com/join",
    referrer: "https://shopper.example.com/home",
  } satisfies IShoppingCustomer.ICreate;
  const auth: IShoppingCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, { body: customerBody });
  typia.assert(auth);

  // 2. Attempt to retrieve a payment attempt using random codes (likely non-existent, testing access is only for own orders)
  const randomOrderCode = RandomGenerator.alphaNumeric(16);
  const randomPaymentReference = RandomGenerator.alphaNumeric(12);

  await TestValidator.error(
    "customer cannot retrieve payment attempt for non-existent/unowned order",
    async () => {
      await api.functional.shopping.customer.orders.payment_attempts.at(
        connection,
        {
          orderCode: randomOrderCode,
          paymentReference: randomPaymentReference,
        },
      );
    },
  );

  // 3. For defense-in-depth, try a second random access (simulate another resource customer cannot own)
  const otherOrderCode = RandomGenerator.alphaNumeric(16);
  const otherPaymentReference = RandomGenerator.alphaNumeric(12);
  await TestValidator.error(
    "customer cannot retrieve payment attempt for unowned order - secondary attempt",
    async () => {
      await api.functional.shopping.customer.orders.payment_attempts.at(
        connection,
        {
          orderCode: otherOrderCode,
          paymentReference: otherPaymentReference,
        },
      );
    },
  );
}
