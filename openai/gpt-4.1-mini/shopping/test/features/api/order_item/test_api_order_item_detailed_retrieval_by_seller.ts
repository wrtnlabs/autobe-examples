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

/**
 * Validates the retrieval of detailed order item information by a seller.
 *
 * This test encompasses the complete workflow of creating seller and customer
 * users, creating products and product SKU variants, placing an order by the
 * customer, adding order items by the seller, and finally retrieving the
 * detailed data of the order item.
 *
 * Steps:
 *
 * 1. Seller registration and authentication
 * 2. Product creation by seller
 * 3. SKU variant creation for the product
 * 4. Customer registration and authentication
 * 5. Customer creates an order referencing the product SKUs
 * 6. Seller adds an order item to the order
 * 7. Seller retrieves detailed order item info by orderCode and itemId
 * 8. Assertion to ensure retrieved data matches the created order item
 */
export async function test_api_order_item_detailed_retrieval_by_seller(
  connection: api.IConnection,
) {
  // 1. Seller registration
  const sellerCreationBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password123!",
    store_name: RandomGenerator.name(),
  } satisfies IShoppingMallSeller.ICreate;
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerCreationBody,
    });
  typia.assert(seller);

  // 2. Seller login (dynamic authentication for multiple actor switching)
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerCreationBody.email,
      password: "Password123!",
      ip: null,
      href: "https://localhost/login",
      referrer: "https://localhost/",
    } satisfies IShoppingMallSeller.ILogin,
  });

  // 3. Create a product by the seller
  const alphaNumericCode = RandomGenerator.alphaNumeric(10);
  const productCreationBody = {
    code: alphaNumericCode,
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    brand: RandomGenerator.name(),
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreationBody,
    });
  typia.assert(product);

  // 4. Create SKU variants for the product
  const sku1Body = {
    sku_code: RandomGenerator.alphaNumeric(8),
    price: 15000,
    attributes_json: JSON.stringify({ color: "red", size: "M" }),
  } satisfies IShoppingMallProductSku.ICreate;
  const sku1: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.createSku(
      connection,
      {
        productCode: productCreationBody.code,
        body: sku1Body,
      },
    );
  typia.assert(sku1);

  const sku2Body = {
    sku_code: RandomGenerator.alphaNumeric(8),
    price: 25000,
    attributes_json: JSON.stringify({ color: "blue", size: "L" }),
  } satisfies IShoppingMallProductSku.ICreate;
  const sku2: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.createSku(
      connection,
      {
        productCode: productCreationBody.code,
        body: sku2Body,
      },
    );
  typia.assert(sku2);

  // 5. Customer registration
  const customerCreationBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password456!",
    nickname: RandomGenerator.name(),
  } satisfies IShoppingMallCustomer.ICreate;
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerCreationBody,
    });
  typia.assert(customer);

  // 6. Customer login (actor switching)
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerCreationBody.email,
      password: "Password456!",
      ip: null,
      href: "https://localhost/login",
      referrer: "https://localhost/",
    } satisfies IShoppingMallCustomer.ILogin,
  });

  // 7. Customer creates an order
  const orderCode = RandomGenerator.alphaNumeric(12);
  const orderCreateBody = {
    order_code: orderCode,
    shipping_address: RandomGenerator.paragraph({ sentences: 3 }),
    shopping_mall_order_items: [],
  } satisfies IShoppingMallOrder.ICreate;
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(order);

  // 8. Switch back to seller auth
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerCreationBody.email,
      password: "Password123!",
      ip: null,
      href: "https://localhost/login",
      referrer: "https://localhost/",
    } satisfies IShoppingMallSeller.ILogin,
  });

  // 9. Seller adds an order item referencing sku1
  const orderItemCreateBody = {
    shopping_mall_product_sku_id: sku1.id,
    quantity: 2,
    unit_price: sku1.price,
    total_price: sku1.price * 2,
  } satisfies IShoppingMallOrderItem.ICreate;
  const createdOrderItem: IShoppingMallOrderItem =
    await api.functional.shoppingMall.seller.orders.items.create(connection, {
      orderCode: orderCode,
      body: orderItemCreateBody,
    });
  typia.assert(createdOrderItem);

  // 10. Seller retrieves detailed order item info by orderCode and itemId
  const retrievedOrderItem: IShoppingMallOrderItem =
    await api.functional.shoppingMall.seller.orders.items.at(connection, {
      orderCode: orderCode,
      itemId: createdOrderItem.id,
    });
  typia.assert(retrievedOrderItem);

  // 11. Assert that retrieved data matches created order item
  TestValidator.equals(
    "Retrieved order item matches created order item",
    retrievedOrderItem,
    createdOrderItem,
  );
}
