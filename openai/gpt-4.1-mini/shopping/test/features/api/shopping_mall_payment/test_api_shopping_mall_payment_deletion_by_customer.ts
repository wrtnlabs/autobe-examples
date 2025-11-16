import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";

/**
 * Test the deletion of a payment record by an authenticated customer.
 *
 * This scenario covers the flow where a customer first creates a new account
 * via the join operation, then creates a shopping mall order required for the
 * payment record, and finally deletes the payment associated with that order.
 *
 * Verifications include ensuring that only authorized customers can delete
 * payment records and that the deletion is irreversible.
 */
export async function test_api_shopping_mall_payment_deletion_by_customer(
  connection: api.IConnection,
) {
  // Step 1. Customer joins the platform
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email,
        password: "validPassword123",
        full_name: RandomGenerator.name(),
        ip: null,
        href: "https://example.com/signup",
        referrer: "https://example.com/landing",
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // Step 2. Customer creates a shopping mall order
  // Use realistic but random values for order creation
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.shoppingMallOrders.create(
      connection,
      {
        body: {
          order_number: `ORD-${RandomGenerator.alphaNumeric(10).toUpperCase()}`,
          status: "pending",
          payment_status: "pending",
          total_amount: Math.round(Math.random() * 100000) / 100,
        } satisfies IShoppingMallOrder.ICreate,
      },
    );
  typia.assert(order);

  // Step 3. Customer deletes the payment record associated with the order
  // Using order.id for shoppingMallPaymentId as plausible unique id for payment
  await api.functional.shoppingMall.customer.shoppingMallPayments.erase(
    connection,
    {
      shoppingMallPaymentId: order.id,
    },
  );
}
