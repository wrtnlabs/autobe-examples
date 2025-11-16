import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderCancellation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderCancellation";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate retrieval of a shopping mall order cancellation by seller.
 *
 * This test covers the complete workflow from seller registration, customer
 * registration, order creation, cancellation request creation, to retrieval by
 * seller.
 *
 * It verifies authentication switching, data correctness, and adherence to
 * authorization boundaries.
 */
export async function test_api_shopping_mall_order_cancellation_retrieval_by_seller(
  connection: api.IConnection,
) {
  // 1. Seller account registration
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerCreationBody = {
    email: sellerEmail,
    password: "Test@1234",
    name: RandomGenerator.name(),
  } satisfies IShoppingMallSeller.ICreate;
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerCreationBody,
    });
  typia.assert(seller);

  // 2. Customer account registration
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerCreationBody = {
    email: customerEmail,
    password: "Test@1234",
    full_name: RandomGenerator.name(),
    href: "https://test.com/signup",
    referrer: "https://test.com/landing",
  } satisfies IShoppingMallCustomer.ICreate;
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerCreationBody,
    });
  typia.assert(customer);

  // 3. Authenticate as customer for order placement
  const customerLoginBody = {
    email: customerEmail,
    password: "Test@1234",
    href: "https://test.com/login",
    referrer: "https://test.com/home",
  } satisfies IShoppingMallCustomer.ILogin;
  const customerLogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLogin);

  // 4. Customer creates a new order
  const orderCreationBody = {
    order_number: `ORD-${RandomGenerator.alphaNumeric(8)}`,
    status: "pending",
    payment_status: "pending",
    total_amount: Math.floor(1000 + Math.random() * 9000),
  } satisfies IShoppingMallOrder.ICreate;
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.shoppingMallOrders.create(
      connection,
      {
        body: orderCreationBody,
      },
    );
  typia.assert(order);

  TestValidator.predicate(
    "Order ID is valid UUID",
    /^[0-9a-fA-F-]{36}$/.test(order.id),
  );

  // 5. Authenticate as seller to create cancellation
  const sellerLoginBody = {
    email: sellerEmail,
    password: "Test@1234",
    href: "https://test.com/login",
    referrer: "https://test.com/home",
  } satisfies IShoppingMallSeller.ILogin;
  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogin);

  // 6. Seller creates order cancellation
  const orderCancellationCreationBody = {
    shopping_mall_order_id: order.id,
    reason: "Customer requested cancellation",
    status: "pending",
  } satisfies IShoppingMallOrderCancellation.ICreate;
  const cancellation: IShoppingMallOrderCancellation =
    await api.functional.shoppingMall.seller.shoppingMallOrderCancellations.create(
      connection,
      {
        body: orderCancellationCreationBody,
      },
    );
  typia.assert(cancellation);

  // 7. Seller retrieves the specific order cancellation by ID
  const retrievedCancellation: IShoppingMallOrderCancellation =
    await api.functional.shoppingMall.seller.shoppingMallOrderCancellations.at(
      connection,
      {
        shoppingMallOrderCancellationId: cancellation.id,
      },
    );
  typia.assert(retrievedCancellation);

  // 8. Validate retrieved cancellation equals the created cancellation
  TestValidator.equals(
    "Matching cancellation IDs",
    retrievedCancellation.id,
    cancellation.id,
  );
  TestValidator.equals(
    "Matching order IDs",
    retrievedCancellation.shopping_mall_order_id,
    cancellation.shopping_mall_order_id,
  );
  TestValidator.equals(
    "Matching customer IDs",
    retrievedCancellation.shopping_mall_customer_id,
    cancellation.shopping_mall_customer_id,
  );
  TestValidator.equals(
    "Matching reason",
    retrievedCancellation.reason ?? null,
    cancellation.reason ?? null,
  );
  TestValidator.equals(
    "Matching status",
    retrievedCancellation.status,
    cancellation.status,
  );
}
