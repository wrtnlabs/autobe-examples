import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
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
 * Validate administrator's ability to retrieve detailed information for a
 * specific order item by its order code and item ID.
 *
 * This test executes a multi-actor scenario involving administrator, seller,
 * and customer roles within a shopping mall system. The workflow includes:
 *
 * 1. Admin user account registration and login
 * 2. Seller user registration and login
 * 3. Customer user registration and login
 * 4. Seller creates a new product
 * 5. Seller adds SKU variants to the product
 * 6. Customer places an order with the SKU
 * 7. Admin adds an order item to the customer's order
 * 8. Admin retrieves detailed information about the order item
 *
 * The test verifies that:
 *
 * - Authentication tokens are properly issued and switched between actors.
 * - Product and SKU creation use valid data following DTO constraints.
 * - Customer order creation includes proper order data.
 * - Order item creation associates the item with correct SKU and quantity.
 * - Admin retrieval returns the correct order item details matching the created
 *   item.
 *
 * @param connection HTTP connection instance used to call APIs
 */
export async function test_api_order_item_detailed_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin joins and logs in, getting admin authorization token
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminTest123!",
    full_name: RandomGenerator.name(2),
  } satisfies IShoppingMallAdmin.IJoin;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(admin);

  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.login.test/",
    referrer: "https://admin.referrer.test/",
  } satisfies IShoppingMallAdmin.ILogin;
  const adminLoggedIn: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, { body: adminLoginBody });
  typia.assert(adminLoggedIn);

  // 2. Seller joins and logs in
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SellerTest123!",
    store_name: RandomGenerator.name(2),
  } satisfies IShoppingMallSeller.ICreate;
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, { body: sellerJoinBody });
  typia.assert(seller);

  const sellerLoginBody = {
    email: sellerJoinBody.email,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.login.test/",
    referrer: "https://seller.referrer.test/",
  } satisfies IShoppingMallSeller.ILogin;
  const sellerLoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoggedIn);

  // 3. Customer joins and logs in
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "CustomerTest123!",
    nickname: RandomGenerator.name(1),
  } satisfies IShoppingMallCustomer.ICreate;
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customer);

  const customerLoginBody = {
    email: customerJoinBody.email,
    password: customerJoinBody.password,
    href: "https://customer.login.test/",
    referrer: "https://customer.referrer.test/",
  } satisfies IShoppingMallCustomer.ILogin;
  const customerLoggedIn: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLoggedIn);

  // 4. Seller creates a product
  // Switch to seller authentication token
  await api.functional.auth.seller.login(connection, { body: sellerLoginBody });

  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 7,
    }),
    brand: RandomGenerator.name(1),
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 5. Seller adds SKU to the product
  const skuCreateBody = {
    sku_code: RandomGenerator.alphaNumeric(8),
    price: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<100> & tags.Maximum<100000>
    >(),
    attributes_json: JSON.stringify({ color: "Red", size: "M" }),
  } satisfies IShoppingMallProductSku.ICreate;
  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.createSku(
      connection,
      { productCode: product.code, body: skuCreateBody },
    );
  typia.assert(sku);

  // 6. Customer places an order
  // Switch to customer authentication token
  await api.functional.auth.customer.login(connection, {
    body: customerLoginBody,
  });

  const orderCreateBody: IShoppingMallOrder.ICreate = {
    order_code: RandomGenerator.alphaNumeric(12),
    shipping_address: `${RandomGenerator.name(1)} street, City, Country`,
    shopping_mall_order_items: [],
  };
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(order);

  // 7. Admin adds an order item
  // Switch to admin authentication token
  await api.functional.auth.admin.login(connection, { body: adminLoginBody });

  const orderItemCreateBody = {
    shopping_mall_product_sku_id: sku.id,
    quantity: 2,
    unit_price: skuCreateBody.price,
    total_price: skuCreateBody.price * 2,
  } satisfies IShoppingMallOrderItem.ICreate;

  const orderItem: IShoppingMallOrderItem =
    await api.functional.shoppingMall.admin.orders.items.create(connection, {
      orderCode: order.order_code,
      body: orderItemCreateBody,
    });
  typia.assert(orderItem);

  // 8. Admin retrieves detailed information for the order item
  const retrievedOrderItem: IShoppingMallOrderItem =
    await api.functional.shoppingMall.admin.orders.items.at(connection, {
      orderCode: order.order_code,
      itemId: orderItem.id,
    });
  typia.assert(retrievedOrderItem);

  // Validate that retrieved item matches the created order item
  TestValidator.equals(
    "Order item ID should match",
    retrievedOrderItem.id,
    orderItem.id,
  );
  TestValidator.equals(
    "Order item SKU ID should match",
    retrievedOrderItem.shopping_mall_product_sku_id,
    orderItem.shopping_mall_product_sku_id,
  );
  TestValidator.equals(
    "Order item quantity should match",
    retrievedOrderItem.quantity,
    orderItem.quantity,
  );
  TestValidator.equals(
    "Order item unit price should match",
    retrievedOrderItem.unit_price,
    orderItem.unit_price,
  );
  TestValidator.equals(
    "Order item total price should match",
    retrievedOrderItem.total_price,
    orderItem.total_price,
  );
}
