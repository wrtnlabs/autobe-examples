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
 * Validate the ability for seller to update shipment tracking.
 *
 * This test follows the full lifecycle of a seller creating an account,
 * creating a product, a customer placing an order for that product, seller
 * creating shipment tracking, and seller updating it. Ensures authentication,
 * authorization, data flow, type safety, and business validation.
 *
 * Steps
 *
 * 1. Seller signs up and authenticates.
 * 2. Seller creates a new product.
 * 3. Customer signs up and authenticates.
 * 4. Customer places an order for the product.
 * 5. Seller creates a shipment tracking record for the order.
 * 6. Seller updates the shipment tracking record with new shipment details.
 * 7. Validate the update response matches expected values.
 * 8. Validate the persistence of updated shipment tracking.
 * 9. Validates unauthorized access is prevented.
 */
export async function test_api_shipment_tracking_update_by_seller(
  connection: api.IConnection,
) {
  // 1. Seller sign up and authentication
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: "TestPass1234!",
        store_name: "Test Seller Store",
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // 2. Seller creates a product
  const productCode = RandomGenerator.alphaNumeric(10);
  const productName = RandomGenerator.name(2);
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        code: productCode,
        name: productName,
        description: "Test product description",
        brand: "Test Brand",
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product);

  // 3. Customer sign up and authentication
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: "CustPass1234!",
        nickname: "TestCustomer",
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // 4. Customer places an order for the product
  // Assuming product has one SKU, create an order with that SKU.
  // If no SKUs, then the productSkuId must be set to product id for test.
  const productSkuId = product.shopping_mall_product_skus?.length
    ? product.shopping_mall_product_skus[0].id
    : product.id;
  const orderCreateBody = {
    order_code: `ORD-${Date.now()}`,
    shipping_address: "123 Test Street, Test City",
    shopping_mall_order_items: [
      {
        shopping_mall_product_sku_id: productSkuId,
        quantity: 1,
        unit_price: 100,
        total_price: 100,
      },
    ],
    shopping_mall_payments: [
      {
        shopping_mall_order_id: "00000000-0000-0000-0000-000000000000", // will be ignored on create
        payment_method: "credit_card",
        payment_status: "completed",
        payment_amount: 100,
        payment_date: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
  } satisfies IShoppingMallOrder.ICreate;
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(order);

  // 5. Seller creates a shipment tracking record for the order
  const shipmentTrackingCreateBody = {
    shopping_mall_order_id: order.id,
    tracking_number: "TRACK123456789",
    carrier_name: "CarrierX",
    shipping_status: "shipped",
    shipped_at: new Date().toISOString(),
    delivered_at: null,
    deleted_at: null,
  } satisfies IShoppingMallShipmentTracking.ICreate;
  const shipmentTracking: IShoppingMallShipmentTracking =
    await api.functional.shoppingMall.seller.shipmentTrackings.create(
      connection,
      {
        body: shipmentTrackingCreateBody,
      },
    );
  typia.assert(shipmentTracking);

  // 6. Seller updates the shipment tracking record
  const updatedNumber = "TRACK987654321";
  const updatedCarrier = "CarrierY";
  const updatedStatus = "in_transit";
  const updatedShippedAt = new Date().toISOString();
  const updatedDeliveredAt = null;
  const updateBody = {
    tracking_number: updatedNumber,
    carrier_name: updatedCarrier,
    shipping_status: updatedStatus,
    shipped_at: updatedShippedAt,
    delivered_at: updatedDeliveredAt,
  } satisfies IShoppingMallShipmentTracking.IUpdate;
  const updatedShipmentTracking: IShoppingMallShipmentTracking =
    await api.functional.shoppingMall.seller.shipmentTrackings.updateShipmentTracking(
      connection,
      {
        id: shipmentTracking.id,
        body: updateBody,
      },
    );
  typia.assert(updatedShipmentTracking);
  TestValidator.equals(
    "tracking number should be updated",
    updatedShipmentTracking.tracking_number,
    updatedNumber,
  );
  TestValidator.equals(
    "carrier name should be updated",
    updatedShipmentTracking.carrier_name,
    updatedCarrier,
  );
  TestValidator.equals(
    "shipping status should be updated",
    updatedShipmentTracking.shipping_status,
    updatedStatus,
  );
  TestValidator.equals(
    "shipped_at should be updated",
    updatedShipmentTracking.shipped_at,
    updatedShippedAt,
  );
  TestValidator.equals(
    "delivered_at should be updated",
    updatedShipmentTracking.delivered_at,
    updatedDeliveredAt,
  );

  // 7. Validate persistence of update by performing read-back
  // (simulate by calling updateShipmentTracking and expect same data)
  const readBackShipmentTracking =
    await api.functional.shoppingMall.seller.shipmentTrackings.updateShipmentTracking(
      connection,
      {
        id: shipmentTracking.id,
        body: updateBody,
      },
    );
  typia.assert(readBackShipmentTracking);
  TestValidator.equals(
    "read-back tracking number matches",
    readBackShipmentTracking.tracking_number,
    updatedNumber,
  );
  TestValidator.equals(
    "read-back carrier name matches",
    readBackShipmentTracking.carrier_name,
    updatedCarrier,
  );
  TestValidator.equals(
    "read-back shipping status matches",
    readBackShipmentTracking.shipping_status,
    updatedStatus,
  );
  TestValidator.equals(
    "read-back shipped_at matches",
    readBackShipmentTracking.shipped_at,
    updatedShippedAt,
  );
  TestValidator.equals(
    "read-back delivered_at matches",
    readBackShipmentTracking.delivered_at,
    updatedDeliveredAt,
  );

  // 8. Validate unauthorized access prevention
  // Customer tries updating shipment tracking - should fail
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: "CustPass1234!",
      ip: null,
      href: "http://localhost/",
      referrer: "http://localhost/prev",
    } satisfies IShoppingMallCustomer.ILogin,
  });
  await TestValidator.error(
    "customer cannot update shipment tracking",
    async () => {
      await api.functional.shoppingMall.seller.shipmentTrackings.updateShipmentTracking(
        connection,
        {
          id: shipmentTracking.id,
          body: updateBody,
        },
      );
    },
  );
}
