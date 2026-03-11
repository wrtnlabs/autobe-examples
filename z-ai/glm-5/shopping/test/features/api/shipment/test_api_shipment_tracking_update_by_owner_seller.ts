import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_administrator_categories_create } from "../../../generate/generate_random_shopping_mall_administrator_categories_create";
import { generate_random_shopping_mall_customer_addresses_create } from "../../../generate/generate_random_shopping_mall_customer_addresses_create";
import { generate_random_shopping_mall_customer_checkout_create } from "../../../generate/generate_random_shopping_mall_customer_checkout_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_seller_products_create";
import { generate_random_shopping_mall_seller_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_seller_shipments_create";
import { prepare_random_shopping_mall_address } from "../../../prepare/prepare_random_shopping_mall_address";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

export async function test_api_shipment_tracking_update_by_owner_seller(
  connection: api.IConnection,
): Promise<void> {
  // =====================
  // Prerequisites Setup
  // =====================
  // 1. Create Administrator for category creation
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {});
  // 2. Create Category
  const category =
    await generate_random_shopping_mall_administrator_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 3. Create Seller A (shipment owner)
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      shopName: RandomGenerator.name(),
    },
  });
  typia.assert(sellerAuth);
  // 4. Create Product owned by Seller A
  const product =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          categoryId: category.id,
          basePrice: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
        },
      },
    );
  typia.assert(product);
  // 5. Create Product Variant (SKU)
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: RandomGenerator.alphaNumeric(8).toUpperCase(),
          option_values: { color: "Black", size: "M" },
          price: typia.random<
            number & tags.Minimum<0.01> & tags.Maximum<999999.99>
          >(),
        },
      },
    );
  typia.assert(variant);
  // 6. Create Customer for order creation
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 7. Create Shipping Address for Customer
  const address = await generate_random_shopping_mall_customer_addresses_create(
    customerConnection,
    {
      body: {
        recipientName: RandomGenerator.name(),
        phoneNumber: RandomGenerator.mobile(),
        streetAddress: RandomGenerator.paragraph({ sentences: 1 }),
        city: "Seoul",
        stateProvince: "Seoul",
        postalCode: "04500",
        country: "South Korea",
      },
    },
  );
  typia.assert(address);
  // 8. Create Order via Checkout (creates paid order items)
  const order = await generate_random_shopping_mall_customer_checkout_create(
    customerConnection,
    {
      body: {
        addressId: address.id,
      },
    },
  );
  typia.assert(order);
  // 9. Find order items belonging to Seller A with 'paid' status
  const paidOrderItems = order.orderItems.filter(
    (item) => item.seller.id === sellerAuth.id && item.status === "paid",
  );
  // 10. Create Shipment as Seller A for their paid order items
  const originalCarrierName = "FedEx Original";
  const originalTrackingNumber = "FX123456789";
  const shipment =
    await generate_random_shopping_mall_seller_seller_shipments_create(
      sellerConnection,
      {
        body: {
          carrierName: originalCarrierName,
          trackingNumber: originalTrackingNumber,
          orderId: order.id,
          orderItemIds: paidOrderItems.map((item) => item.id),
        },
      },
    );
  typia.assert(shipment);
  // =====================
  // Test Execution
  // =====================
  // Store original values for comparison
  const originalShippedAt = shipment.shippedAt;
  const originalSellerId = shipment.seller.id;
  const originalOrderId = shipment.order.id;
  const originalDeliveredAt = shipment.deliveredAt;
  // Generate new tracking information
  const newCarrierName = "UPS Updated Express";
  const newTrackingNumber = "UPS987654321XYZ";
  // Update shipment tracking information
  const updatedShipment =
    await api.functional.shoppingMall.seller.shipments.update(
      sellerConnection,
      {
        shipmentId: shipment.id,
        body: {
          carrier_name: newCarrierName,
          tracking_number: newTrackingNumber,
        },
      },
    );
  typia.assert(updatedShipment);
  // =====================
  // Validation
  // =====================
  // Verify carrier name updated
  TestValidator.equals(
    "carrier name should be updated",
    updatedShipment.carrierName,
    newCarrierName,
  );
  // Verify tracking number updated
  TestValidator.equals(
    "tracking number should be updated",
    updatedShipment.trackingNumber,
    newTrackingNumber,
  );
  // Verify seller reference unchanged
  TestValidator.equals(
    "seller reference should remain unchanged",
    updatedShipment.seller.id,
    originalSellerId,
  );
  // Verify order reference unchanged
  TestValidator.equals(
    "order reference should remain unchanged",
    updatedShipment.order.id,
    originalOrderId,
  );
  // Verify shippedAt timestamp unchanged
  TestValidator.equals(
    "shippedAt timestamp should remain unchanged",
    updatedShipment.shippedAt,
    originalShippedAt,
  );
  // Verify deliveredAt remains null
  TestValidator.equals(
    "deliveredAt should remain null",
    updatedShipment.deliveredAt,
    null,
  );
  // Verify order items unchanged
  TestValidator.equals(
    "order items count should remain unchanged",
    updatedShipment.orderItems.length,
    shipment.orderItems.length,
  );
}
