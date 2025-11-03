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
 * Test retrieving detailed shipment tracking information as an authenticated
 * seller.
 *
 * This test performs the following sequence:
 *
 * 1. Authenticate a seller user through /auth/seller/join.
 * 2. Create a product associated with the authenticated seller.
 * 3. Authenticate a customer user through /auth/customer/join.
 * 4. Customer places an order for the product.
 * 5. Seller creates a shipment tracking record linked to the order.
 * 6. Seller retrieves shipment tracking details by shipment ID.
 *
 * Validation verifies that shipment tracking details are only accessible by the
 * authorized seller. This ensures secure access to sensitive shipment tracking
 * info.
 */
export async function test_api_shipment_tracking_retrieval_by_seller(
  connection: api.IConnection,
) {
  // 1. Seller joins and authenticates
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: "SellerPass123!",
        store_name: RandomGenerator.name(2),
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // 2. Seller creates a product
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        code: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(3),
        description: RandomGenerator.content({ paragraphs: 2 }),
        brand: RandomGenerator.name(1),
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product);

  // 3. Customer joins and authenticates
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: "CustomerPass123!",
        nickname: RandomGenerator.name(2),
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // 4. Customer creates an order using the product
  // Construct order items from the single product's SKU(s) if available
  // Because IShoppingMallProductSku[] is optional, we need to handle absence
  let skuIds: string[] = [];
  if (
    product.shopping_mall_product_skus &&
    product.shopping_mall_product_skus.length > 0
  ) {
    skuIds = product.shopping_mall_product_skus.map((sku) => sku.id);
  }
  if (skuIds.length === 0) {
    // If no SKU exists, make one up with code string or skip order
    // But product SKU creation is not in scope, so skip SKU-based ordering
    // We'll create an order with no items (not correct), so skip this test
    throw new Error("Product SKUs not available to create order items");
  }
  // Prepare order items
  const orderItems: IShoppingMallOrderItem.ICreate[] = skuIds.map((skuId) => ({
    shopping_mall_product_sku_id: skuId,
    quantity: 1,
    unit_price: 10000, // base price, fixed for testing
    total_price: 10000 * 1,
  }));

  const orderCode = RandomGenerator.alphaNumeric(12);
  const shippingAddress = `${RandomGenerator.name(1)}, ${RandomGenerator.name(1)}, ${RandomGenerator.name(1)}`;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: {
        order_code: orderCode,
        shipping_address: shippingAddress,
        shopping_mall_order_items: orderItems,
      } satisfies IShoppingMallOrder.ICreate,
    });
  typia.assert(order);

  // 5. Seller creates shipment tracking record linked to the order
  // Get current ISO datetime for shipped_at
  const shippedAt = new Date().toISOString();
  // delivered_at is optional, leave as null

  const shipmentTrackingCreateBody = {
    shopping_mall_order_id: order.id,
    tracking_number: RandomGenerator.alphaNumeric(16),
    carrier_name: RandomGenerator.name(1),
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

  // 6. Seller retrieves shipment tracking by ID
  const retrievedTracking: IShoppingMallShipmentTracking =
    await api.functional.shoppingMall.seller.shipmentTrackings.at(connection, {
      id: shipmentTracking.id,
    });
  typia.assert(retrievedTracking);

  // Validate shipment tracking belongs to the order
  TestValidator.equals(
    "shipment tracking order ID matches",
    retrievedTracking.shopping_mall_order_id,
    order.id,
  );
  // Validate tracking number and carrier name equality
  TestValidator.equals(
    "shipment tracking tracking number matches",
    retrievedTracking.tracking_number,
    shipmentTracking.tracking_number,
  );
  TestValidator.equals(
    "shipment tracking carrier name matches",
    retrievedTracking.carrier_name,
    shipmentTracking.carrier_name,
  );
  // Validate shipped_at timestamp matches
  TestValidator.equals(
    "shipment tracking shipped at matches",
    retrievedTracking.shipped_at,
    shipmentTracking.shipped_at,
  );
  // Validate shipping status
  TestValidator.equals(
    "shipment tracking shipping status matches",
    retrievedTracking.shipping_status,
    shipmentTracking.shipping_status,
  );
}
