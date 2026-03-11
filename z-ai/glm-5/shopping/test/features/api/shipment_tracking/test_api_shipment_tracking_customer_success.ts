import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
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

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_customer_addresses_create } from "../../../generate/generate_random_shopping_mall_customer_addresses_create";
import { generate_random_shopping_mall_customer_checkout_create } from "../../../generate/generate_random_shopping_mall_customer_checkout_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_seller_products_create";
import { generate_random_shopping_mall_seller_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_seller_shipments_create";
import { prepare_random_shopping_mall_address } from "../../../prepare/prepare_random_shopping_mall_address";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test a customer successfully viewing detailed tracking information for a shipment.
 *
 * This test validates that a customer can retrieve complete shipment tracking
 * details including carrier information, tracking number, shipping status,
 * and included order items.
 */
export async function test_api_shipment_tracking_customer_success(
  connection: api.IConnection,
): Promise<void> {
  // ========================================
  // 1. Seller Setup - Create approved seller with product and variant
  // ========================================
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shopName: RandomGenerator.name(),
    },
  });
  typia.assert(sellerAuth);
  // Create product with category ID
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const product =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          categoryId,
          basePrice: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
        } satisfies IShoppingMallProduct.ICreate,
      },
    );
  typia.assert(product);
  // Create variant
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          option_values: {
            color: RandomGenerator.pick(["Red", "Blue", "Green"] as const),
            size: RandomGenerator.pick(["S", "M", "L"] as const),
          },
          price: null,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // ========================================
  // 2. Customer Setup - Create customer with shipping address
  // ========================================
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(customerAuth);
  // Create shipping address
  const address = await generate_random_shopping_mall_customer_addresses_create(
    customerConnection,
    {
      body: {
        recipientName: RandomGenerator.name(),
        phoneNumber: RandomGenerator.mobile(),
        streetAddress: RandomGenerator.paragraph({ sentences: 1 }),
        city: RandomGenerator.name(),
        stateProvince: RandomGenerator.name(),
        postalCode: RandomGenerator.alphaNumeric(6),
        country: RandomGenerator.pick(["USA", "Korea", "Japan"] as const),
      } satisfies IShoppingMallAddress.ICreate,
    },
  );
  typia.assert(address);
  // ========================================
  // 3. Place Order - Customer checks out
  // ========================================
  const order = await generate_random_shopping_mall_customer_checkout_create(
    customerConnection,
    {
      body: {
        addressId: address.id,
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);
  // Get the order item ID for shipment
  const orderItem = order.orderItems[0];
  TestValidator.predicate("order has items", order.orderItems.length > 0);
  TestValidator.equals("order item status is paid", orderItem.status, "paid");
  // ========================================
  // 4. Create Shipment - Seller ships the order
  // ========================================
  const shipment =
    await generate_random_shopping_mall_seller_seller_shipments_create(
      sellerConnection,
      {
        body: {
          carrierName: RandomGenerator.pick([
            "FedEx",
            "UPS",
            "DHL",
            "USPS",
          ] as const),
          trackingNumber: RandomGenerator.alphaNumeric(12).toUpperCase(),
          orderId: order.id,
          orderItemIds: [orderItem.id],
        } satisfies IShoppingMallShipment.ICreate,
      },
    );
  typia.assert(shipment);
  // ========================================
  // 5. Target Operation - Customer retrieves shipment tracking
  // ========================================
  const shipmentTracking =
    await api.functional.shoppingMall.customer.orders.shipments.at(
      customerConnection,
      {
        orderId: order.id,
        shipmentId: shipment.id,
      },
    );
  typia.assert(shipmentTracking);
  // ========================================
  // 6. Validate Response - Business rule validation
  // ========================================
  // Requirement [892]: Carrier name and tracking number displayed
  TestValidator.predicate(
    "carrier name is non-empty",
    shipmentTracking.carrierName.length > 0,
  );
  TestValidator.predicate(
    "tracking number is non-empty",
    shipmentTracking.trackingNumber.length > 0,
  );
  // Validate shipment ID matches
  TestValidator.equals("shipment id matches", shipmentTracking.id, shipment.id);
  // Validate shippedAt timestamp exists
  TestValidator.predicate(
    "shippedAt is valid ISO datetime",
    shipmentTracking.shippedAt !== null,
  );
  // Validate deliveredAt is null (pending delivery)
  TestValidator.equals(
    "deliveredAt is null for pending delivery",
    shipmentTracking.deliveredAt,
    null,
  );
  // Requirement [1071]: Shipment associated with exactly one seller
  TestValidator.equals(
    "seller id matches",
    shipmentTracking.seller.id,
    sellerAuth.id,
  );
  // Validate order reference
  TestValidator.equals("order id matches", shipmentTracking.order.id, order.id);
  // Requirement [332]: Order items included in shipment are shown
  TestValidator.predicate(
    "orderItems is not empty",
    shipmentTracking.orderItems.length > 0,
  );
  // Validate order item details
  const trackedItem = shipmentTracking.orderItems[0];
  TestValidator.equals("order item id matches", trackedItem.id, orderItem.id);
  TestValidator.equals(
    "order item status is shipped",
    trackedItem.status,
    "shipped",
  );
  TestValidator.equals("product matches", trackedItem.product.id, product.id);
  TestValidator.equals("variant matches", trackedItem.variant.id, variant.id);
  // Validate seller information in order item
  TestValidator.equals(
    "seller in order item matches",
    trackedItem.seller.id,
    sellerAuth.id,
  );
}
