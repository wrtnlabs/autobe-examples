import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderCancellation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderCancellation";
import type { IShoppingMallOrderHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderHistory";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductApproval";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReview";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallReturnShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReturnShipment";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";
import type { IShoppingMallShipmentTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentTracking";

export async function test_api_order_item_update_by_customer(
  connection: api.IConnection,
) {
  // 1. Create new customer and authenticate
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "TestPassword123!",
        nickname: RandomGenerator.name(),
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // 2. Create new seller and authenticate
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "SellerPass123!",
        store_name: RandomGenerator.name(),
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // 3. Seller creates a product
  await api.functional.auth.seller.login(connection, {
    body: {
      email: seller.email,
      password: "SellerPass123!",
      ip: null,
      href: "http://test.example.com/login",
      referrer: "http://test.example.com",
    } satisfies IShoppingMallSeller.ILogin,
  });
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(3),
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product);

  // 4. Customer login
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customer.email,
      password: "TestPassword123!",
      ip: null,
      href: "http://test.example.com/login",
      referrer: "http://test.example.com",
    } satisfies IShoppingMallCustomer.ILogin,
  });

  // 5. Create an order containing one item with the product's first SKU
  if (
    !product.shopping_mall_product_skus ||
    product.shopping_mall_product_skus.length === 0
  ) {
    throw new Error("Product must have at least one SKU");
  }
  const sku = product.shopping_mall_product_skus[0];

  const orderItemCreate = {
    shopping_mall_product_sku_id: sku.id,
    quantity: 1,
    unit_price: sku.price,
    total_price: sku.price,
  } satisfies IShoppingMallOrderItem.ICreate;

  const orderCreateBody = {
    order_code: RandomGenerator.alphaNumeric(12),
    shipping_address: "123 Test St, Test City",
    shopping_mall_order_items: [orderItemCreate],
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(order);

  // 6. Update the order item quantity and prices
  const orderItemToUpdate = order.shopping_mall_order_items[0];

  // Prepare update data
  const newQuantity = orderItemToUpdate.quantity + 1;
  const newUnitPrice = orderItemToUpdate.unit_price + 1000;
  const newTotalPrice = newQuantity * newUnitPrice;

  const updateBody = {
    quantity: newQuantity,
    unit_price: newUnitPrice,
    total_price: newTotalPrice,
  } satisfies IShoppingMallOrderItem.IUpdate;

  // 7. Perform the update
  const updatedOrderItem: IShoppingMallOrderItem =
    await api.functional.shoppingMall.customer.orders.items.updateItem(
      connection,
      {
        orderCode: order.order_code,
        itemId: orderItemToUpdate.id,
        body: updateBody,
      },
    );
  typia.assert(updatedOrderItem);

  // 8. Assert that updated values are reflected
  TestValidator.equals(
    "quantity should be updated",
    updatedOrderItem.quantity,
    newQuantity,
  );
  TestValidator.equals(
    "unit_price should be updated",
    updatedOrderItem.unit_price,
    newUnitPrice,
  );
  TestValidator.equals(
    "total_price should be updated",
    updatedOrderItem.total_price,
    newTotalPrice,
  );
}
