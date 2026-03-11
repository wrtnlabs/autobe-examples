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
 * Test successful delivery confirmation workflow.
 *
 * This test validates the complete delivery confirmation flow where a customer
 * acknowledges receipt of a shipped package. The workflow includes:
 * 1. Customer and seller registration
 * 2. Seller creates product with variant
 * 3. Customer creates address and checks out
 * 4. Seller creates shipment
 * 5. Customer confirms delivery
 */
export async function test_api_shipment_delivery_confirmation_success(
  connection: api.IConnection,
): Promise<void> {
  // ========================================
  // STEP 1: Customer Setup
  // ========================================
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(customer);
  // ========================================
  // STEP 2: Seller Setup
  // ========================================
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shopName: RandomGenerator.name(),
    },
  });
  typia.assert(seller);
  // ========================================
  // STEP 3: Seller Creates Product and Variant
  // ========================================
  const product =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          categoryId: typia.random<string & tags.Format<"uuid">>(),
          basePrice: typia.random<
            number & tags.Minimum<1> & tags.Maximum<100000>
          >(),
        },
      },
    );
  typia.assert(product);
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          option_values: { color: "Black", size: "M" },
          price: product.base_price,
        },
      },
    );
  typia.assert(variant);
  // ========================================
  // STEP 4: Customer Creates Address
  // ========================================
  const address = await generate_random_shopping_mall_customer_addresses_create(
    customerConnection,
    {
      body: {
        recipientName: RandomGenerator.name(),
        phoneNumber: RandomGenerator.mobile(),
        streetAddress: RandomGenerator.paragraph({ sentences: 1 }),
        city: "Seoul",
        stateProvince: "Seoul",
        postalCode: "12345",
        country: "South Korea",
      },
    },
  );
  typia.assert(address);
  // ========================================
  // STEP 5: Customer Checks Out
  // ========================================
  const order = await generate_random_shopping_mall_customer_checkout_create(
    customerConnection,
    {
      body: {
        addressId: address.id,
      },
    },
  );
  typia.assert(order);
  // Verify order was created with items
  TestValidator.predicate("order has items", order.orderItems.length > 0);
  // Find order items belonging to this seller
  const sellerOrderItems = order.orderItems.filter(
    (item) => item.seller.id === seller.id,
  );
  TestValidator.predicate(
    "order has seller items",
    sellerOrderItems.length > 0,
  );
  // ========================================
  // STEP 6: Seller Creates Shipment
  // ========================================
  const shipment =
    await generate_random_shopping_mall_seller_seller_shipments_create(
      sellerConnection,
      {
        body: {
          carrierName: "FedEx",
          trackingNumber: `TRK${Date.now()}`,
          orderId: order.id,
          orderItemIds: sellerOrderItems.map((item) => item.id),
        },
      },
    );
  typia.assert(shipment);
  // Verify shipment was created correctly
  TestValidator.equals("shipment carrier", shipment.carrierName, "FedEx");
  TestValidator.predicate(
    "shipment has tracking",
    shipment.trackingNumber.length > 0,
  );
  TestValidator.predicate(
    "shipment has shippedAt",
    shipment.shippedAt !== null,
  );
  TestValidator.equals(
    "deliveredAt initially null",
    shipment.deliveredAt,
    null,
  );
  // ========================================
  // STEP 7: Customer Confirms Delivery
  // ========================================
  const confirmedShipment =
    await api.functional.shoppingMall.customer.shipments.confirm_delivery.confirmDelivery(
      customerConnection,
      {
        shipmentId: shipment.id,
      },
    );
  typia.assert(confirmedShipment);
  // ========================================
  // STEP 8: Validate Delivery Confirmation
  // ========================================
  // 8.1: deliveredAt timestamp is set
  TestValidator.predicate(
    "deliveredAt timestamp set",
    confirmedShipment.deliveredAt !== null,
  );
  // 8.2: Carrier name and tracking number preserved
  TestValidator.equals(
    "carrier name preserved",
    confirmedShipment.carrierName,
    shipment.carrierName,
  );
  TestValidator.equals(
    "tracking number preserved",
    confirmedShipment.trackingNumber,
    shipment.trackingNumber,
  );
  // 8.3: Order items status changed to 'delivered'
  const deliveredOrderItems = confirmedShipment.orderItems;
  TestValidator.predicate(
    "all items delivered",
    deliveredOrderItems.every((item) => item.status === "delivered"),
  );
}
