import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_order_creation_by_customer(
  connection: api.IConnection,
) {
  // 1. Customer joins and authenticates
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IShoppingMallCustomer.IJoin;

  const authorizedCustomer = await api.functional.auth.customer.join(
    connection,
    { body: joinBody },
  );
  typia.assert(authorizedCustomer);

  // 2. Create Customer entity
  const customerCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
    nickname: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    status: "active",
  } satisfies IShoppingMallCustomer.ICreate;

  const createdCustomer = await api.functional.shoppingMall.customers.create(
    connection,
    { body: customerCreateBody },
  );
  typia.assert(createdCustomer);

  // 3. Create Seller entity
  const sellerCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
    status: "active",
    company_name: RandomGenerator.name(2),
    contact_name: RandomGenerator.name(2),
    phone_number: RandomGenerator.mobile(),
  } satisfies IShoppingMallSeller.ICreate;

  const createdSeller = await api.functional.shoppingMall.admin.sellers.create(
    connection,
    { body: sellerCreateBody },
  );
  typia.assert(createdSeller);

  // 4. Prepare a unique order number string (e.g., "ORD-YYYYMMDD-xxxx")
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomSeq = RandomGenerator.alphaNumeric(4).toUpperCase();
  const orderNumber = `ORD-${datePart}-${randomSeq}`;

  // 5. Create an order as the authenticated customer
  const orderCreateBody = {
    shopping_mall_customer_id: createdCustomer.id,
    shopping_mall_seller_id: createdSeller.id,
    order_number: orderNumber,
    total_price: parseFloat((Math.random() * 1000 + 10).toFixed(2)),
    status: "Pending Payment",
    business_status: "Pending",
    payment_method: "credit_card",
    shipping_address: `${RandomGenerator.name()}, ${RandomGenerator.name(1)}, ${RandomGenerator.mobile()}`,
  } satisfies IShoppingMallOrder.ICreate;

  const createdOrder = await api.functional.shoppingMall.customer.orders.create(
    connection,
    { body: orderCreateBody },
  );
  typia.assert(createdOrder);

  // 6. Validate the created order matches the input
  TestValidator.equals(
    "customer ID matches",
    createdOrder.shopping_mall_customer_id,
    orderCreateBody.shopping_mall_customer_id,
  );
  TestValidator.equals(
    "seller ID matches",
    createdOrder.shopping_mall_seller_id,
    orderCreateBody.shopping_mall_seller_id,
  );
  TestValidator.equals(
    "order number matches",
    createdOrder.order_number,
    orderCreateBody.order_number,
  );
  TestValidator.equals(
    "total price matches",
    createdOrder.total_price,
    orderCreateBody.total_price,
  );
  TestValidator.equals(
    "status matches",
    createdOrder.status,
    orderCreateBody.status,
  );
  TestValidator.equals(
    "business status matches",
    createdOrder.business_status,
    orderCreateBody.business_status,
  );
  TestValidator.equals(
    "payment method matches",
    createdOrder.payment_method,
    orderCreateBody.payment_method,
  );
  TestValidator.equals(
    "shipping address matches",
    createdOrder.shipping_address,
    orderCreateBody.shipping_address,
  );

  // 7. Check datetime string non-null for created_at and updated_at
  TestValidator.predicate(
    "created_at is ISO date string",
    typeof createdOrder.created_at === "string" &&
      createdOrder.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is ISO date string",
    typeof createdOrder.updated_at === "string" &&
      createdOrder.updated_at.length > 0,
  );

  // 8. Confirm deleted_at is null or undefined
  TestValidator.predicate(
    "deleted_at is null or undefined",
    createdOrder.deleted_at === null || createdOrder.deleted_at === undefined,
  );
}
