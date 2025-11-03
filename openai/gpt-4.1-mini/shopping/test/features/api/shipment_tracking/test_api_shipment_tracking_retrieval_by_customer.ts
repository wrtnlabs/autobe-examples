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

export async function test_api_shipment_tracking_retrieval_by_customer(
  connection: api.IConnection,
) {
  // 1. Create and authenticate customer user context
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "securePassword123";
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: customerPassword,
        nickname: RandomGenerator.name(),
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // 2. Create and authenticate seller user context
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = "securePassword456";
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        store_name: RandomGenerator.name(2),
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // 3. Seller creates a product
  const productName = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 8,
  });
  const productCode = RandomGenerator.alphaNumeric(8);
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        code: productCode,
        name: productName,
        description: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 8,
          sentenceMax: 12,
          wordMin: 4,
          wordMax: 8,
        }),
        brand: RandomGenerator.name(1),
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product);

  // 4. Customer places an order for the product
  // For simplicity, create a single order item referencing first product SKU
  // Since the DTO for IShoppingMallOrder.ICreate requires order_code, shipping_address, and order items
  // Generate a realistic order code and shipping address
  const orderCode = `ORD${RandomGenerator.alphaNumeric(6).toUpperCase()}`;
  const shippingAddress = `${RandomGenerator.name(2)}, ${RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 })}`;
  const orderItemSkuId =
    product.shopping_mall_product_skus?.[0]?.id ??
    typia.random<string & tags.Format<"uuid">>();
  const orderItemQuantity = 1;
  const orderItemPrice = 100;
  const orderItemTotal = orderItemQuantity * orderItemPrice;
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: {
        order_code: orderCode,
        shipping_address: shippingAddress,
        shopping_mall_order_items: [
          {
            shopping_mall_product_sku_id: orderItemSkuId,
            quantity: orderItemQuantity,
            unit_price: orderItemPrice,
            total_price: orderItemTotal,
          },
        ],
        shopping_mall_payments: [],
      } satisfies IShoppingMallOrder.ICreate,
    });
  typia.assert(order);

  // 5. Seller creates shipment tracking record linked to the order
  // Provides realistic tracking number and carrier name
  const trackingNumber = `TRK${RandomGenerator.alphaNumeric(10).toUpperCase()}`;
  const carrierName = RandomGenerator.name(1);
  const shippedAt = new Date().toISOString();
  const shipmentTrackingCreateBody = {
    shopping_mall_order_id: order.id,
    tracking_number: trackingNumber,
    carrier_name: carrierName,
    shipping_status: "shipped",
    shipped_at: shippedAt,
    delivered_at: null,
  } satisfies IShoppingMallShipmentTracking.ICreate;

  const shipmentTracking: IShoppingMallShipmentTracking =
    await api.functional.shoppingMall.seller.shipmentTrackings.create(
      connection,
      {
        body: shipmentTrackingCreateBody,
      },
    );
  typia.assert(shipmentTracking);

  // 6. Customer retrieves shipment tracking details by ID
  const retrievedShipmentTracking: IShoppingMallShipmentTracking =
    await api.functional.shoppingMall.customer.shipmentTrackings.at(
      connection,
      {
        id: shipmentTracking.id,
      },
    );
  typia.assert(retrievedShipmentTracking);

  // 7. Validate retrieved data matches shipment tracking created
  TestValidator.equals(
    "shipment tracking id matches",
    retrievedShipmentTracking.id,
    shipmentTracking.id,
  );
  TestValidator.equals(
    "shipment tracking order id matches",
    retrievedShipmentTracking.shopping_mall_order_id,
    order.id,
  );
  TestValidator.equals(
    "shipment tracking tracking number matches",
    retrievedShipmentTracking.tracking_number,
    shipmentTrackingCreateBody.tracking_number,
  );
  TestValidator.equals(
    "shipment tracking carrier name matches",
    retrievedShipmentTracking.carrier_name,
    shipmentTrackingCreateBody.carrier_name,
  );
  TestValidator.equals(
    "shipment tracking shipping status matches",
    retrievedShipmentTracking.shipping_status,
    shipmentTrackingCreateBody.shipping_status,
  );
  TestValidator.equals(
    "shipment tracking shipped at matches",
    retrievedShipmentTracking.shipped_at,
    shipmentTrackingCreateBody.shipped_at,
  );
  TestValidator.equals(
    "shipment tracking delivered at matches",
    retrievedShipmentTracking.delivered_at,
    shipmentTrackingCreateBody.delivered_at,
  );
}
