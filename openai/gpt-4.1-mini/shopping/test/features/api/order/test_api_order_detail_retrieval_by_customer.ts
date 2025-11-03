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
 * Test detailed customer order retrieval by order code.
 *
 * This test validates the complete workflow where a customer and a seller
 * register, a seller creates a product, the customer places an order with that
 * product, and finally the customer retrieves detailed information of that
 * order via its unique order code.
 *
 * The test ensures:
 *
 * 1. Customer and seller registration with proper authentication.
 * 2. Seller successfully creates a product with mandatory properties.
 * 3. Customer creates an order associating the product SKU with valid quantity.
 * 4. Customer retrieves detailed order data including customer info, order items,
 *    payments, shipment tracking, product reviews, order history,
 *    cancellations, refunds, and return shipments.
 * 5. All returned data is validated for TypeScript type correctness using typia.
 * 6. Proper authorization and user role context switches occur between customer
 *    and seller.
 *
 * Workflow:
 *
 * 1. Seller signup at /auth/seller/join
 * 2. Seller login at /auth/seller/login
 * 3. Create product as seller at /shoppingMall/seller/products
 * 4. Customer signup at /auth/customer/join
 * 5. Customer login at /auth/customer/login
 * 6. Create order with product SKU at /shoppingMall/customer/orders
 * 7. Retrieve detailed order data by order code at
 *    /shoppingMall/customer/orders/{orderCode}
 *
 * This test covers important user journeys including multi-actor
 * authentication, resource creation, order placement, and order detail
 * retrieval.
 */
export async function test_api_order_detail_retrieval_by_customer(
  connection: api.IConnection,
) {
  // 1. Seller signup
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = "TestPass123!";
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        store_name: RandomGenerator.name(2),
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // 2. Seller login for session setup
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: "http://localhost/",
      referrer: "http://localhost/start",
    } satisfies IShoppingMallSeller.ILogin,
  });

  // 3. Seller creates product
  const productCode = RandomGenerator.alphaNumeric(10);
  const productName = RandomGenerator.name(3);
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        code: productCode,
        name: productName,
        description: RandomGenerator.paragraph({ sentences: 5 }),
        brand: RandomGenerator.name(1),
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product);

  // Verify SKU presence
  if (
    !product.shopping_mall_product_skus ||
    product.shopping_mall_product_skus.length === 0
  ) {
    throw new Error("Product must have at least one SKU.");
  }

  // Pick the first SKU
  const sku: IShoppingMallProductSku = product.shopping_mall_product_skus[0];
  typia.assert(sku);

  // 4. Customer signup
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "CustPass123!";
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: customerPassword,
        nickname: RandomGenerator.name(1),
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // 5. Customer login for session setup
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: "http://localhost/",
      referrer: "http://localhost/start",
    } satisfies IShoppingMallCustomer.ILogin,
  });

  // 6. Customer places order
  const orderBody: IShoppingMallOrder.ICreate = {
    order_code: RandomGenerator.alphaNumeric(12).toUpperCase(),
    shipping_address: `${RandomGenerator.name(1)}, 1234 Test St, Test City, Test Country`,
    shopping_mall_order_items: [
      {
        shopping_mall_product_sku_id: sku.id,
        quantity: 2,
        unit_price: sku.price,
        total_price: sku.price * 2,
      } satisfies IShoppingMallOrderItem.ICreate,
    ],
  };

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderBody,
    });
  typia.assert(order);

  // 7. Retrieve order details by orderCode
  const retrievedOrder: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.at(connection, {
      orderCode: order.order_code,
    });
  typia.assert(retrievedOrder);

  // Validate ownership and order code
  TestValidator.equals(
    "retrieved order code matches created order code",
    retrievedOrder.order_code,
    order.order_code,
  );
  TestValidator.equals(
    "retrieved order customer id matches created order customer id",
    retrievedOrder.customer.id,
    customer.id,
  );

  // Validate at least one order item and correctness
  TestValidator.predicate(
    "order has at least one item",
    retrievedOrder.shopping_mall_order_items.length > 0,
  );

  // Validate each order item has required properties
  for (const item of retrievedOrder.shopping_mall_order_items) {
    typia.assert(item);
    TestValidator.predicate(
      "order item belongs to requested order",
      item.shopping_mall_order_id === retrievedOrder.id,
    );
  }

  // Validate payments, shipment tracking, product reviews, etc., are arrays
  TestValidator.predicate(
    "payments array presence",
    Array.isArray(retrievedOrder.shopping_mall_payments),
  );
  TestValidator.predicate(
    "shipment tracking array presence",
    Array.isArray(retrievedOrder.shopping_mall_shipment_trackings),
  );
  TestValidator.predicate(
    "product reviews array presence",
    Array.isArray(retrievedOrder.shopping_mall_product_reviews),
  );
  TestValidator.predicate(
    "order histories array presence",
    Array.isArray(retrievedOrder.shopping_mall_order_histories),
  );
  TestValidator.predicate(
    "order cancellations array presence",
    Array.isArray(retrievedOrder.shopping_mall_order_cancellations),
  );
  TestValidator.predicate(
    "refund requests array presence",
    Array.isArray(retrievedOrder.shopping_mall_refund_requests),
  );
  TestValidator.predicate(
    "return shipments array presence",
    Array.isArray(retrievedOrder.shopping_mall_return_shipments),
  );
}
