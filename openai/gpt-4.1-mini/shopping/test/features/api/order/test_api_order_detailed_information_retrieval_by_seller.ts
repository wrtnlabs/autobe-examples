import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_order_detailed_information_retrieval_by_seller(
  connection: api.IConnection,
) {
  // 1. Register a new seller account
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password_hash: sellerPassword,
        status: "active",
        company_name: RandomGenerator.name(2),
        contact_name: RandomGenerator.name(2),
        phone_number: RandomGenerator.mobile(),
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // 2. Register a new customer account
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: RandomGenerator.alphaNumeric(12),
      } satisfies IShoppingMallCustomer.IJoin,
    });
  typia.assert(customer);

  // 3. Customer creates a new order
  const orderNumber = `ORD-${new Date()
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, "")}-${RandomGenerator.alphaNumeric(4).toUpperCase()}`;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: {
        shopping_mall_customer_id: customer.id,
        shopping_mall_seller_id: seller.id,
        order_number: orderNumber,
        total_price: Number((Math.random() * 1000 + 50).toFixed(2)),
        status: "Pending Payment",
        business_status: "new",
        payment_method: "Credit Card",
        shipping_address: `${RandomGenerator.name(1)} St, City, Country`,
      } satisfies IShoppingMallOrder.ICreate,
    });
  typia.assert(order);

  // 4. Authenticate as seller to retrieve order information
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    } satisfies IShoppingMallSeller.ILogin,
  });

  const orderDetail: IShoppingMallOrder =
    await api.functional.shoppingMall.seller.orders.at(connection, {
      orderId: order.id,
    });
  typia.assert(orderDetail);

  // Validate that returned order belongs to the seller
  TestValidator.equals(
    "seller id should match order seller id",
    orderDetail.shopping_mall_seller_id,
    seller.id,
  );
  TestValidator.equals(
    "order id should match requested order id",
    orderDetail.id,
    order.id,
  );
  TestValidator.predicate(
    "order status is valid",
    [
      "Pending Payment",
      "Paid",
      "Processing",
      "Shipped",
      "Delivered",
      "Cancelled",
    ].includes(orderDetail.status),
  );
}
