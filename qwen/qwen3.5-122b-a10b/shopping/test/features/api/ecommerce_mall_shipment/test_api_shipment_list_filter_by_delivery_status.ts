import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallShipment";
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
import { generate_random_ecommerce_mall_customer_orders_create } from "../../../generate/generate_random_ecommerce_mall_customer_orders_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { generate_random_ecommerce_mall_seller_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_shipments_create";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

/**
 * Test shipment list filtering by delivery status for seller.
 *
 * This test validates that sellers can filter shipments using delivered_at date range parameters:
 * - Filter undelivered shipments where delivered_at is null
 * - Filter delivered shipments within a specific date range
 * - Verify the filter correctly handles nullable delivered_at field
 *
 * Test flow:
 * 1. Register and login as seller
 * 2. Register and login as customer
 * 3. Seller creates a product with variant
 * 4. Customer places two orders (for two shipments)
 * 5. Seller creates two shipments (both initially undelivered)
 * 6. Customer confirms delivery on one shipment
 * 7. Test filtering for undelivered shipments (no deliveredAt parameters) - should return 1 shipment
 * 8. Test filtering for delivered shipments (delivered_at has value) - should return 1 shipment
 * 9. Test filtering by delivered_at date range - should return the delivered shipment
 */
export async function test_api_shipment_list_filter_by_delivery_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register seller with known password
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(sellerAuth);
  // 2. Register customer with known password
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(customerAuth);
  // 3. Seller creates a product with variant
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(product);
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
        body: {
          skuCode: RandomGenerator.alphaNumeric(10),
          optionValues: [{ key: "color", value: "Red" }],
          stockQuantity: 100,
        },
      },
    );
  typia.assert(variant);
  // 4. Customer places two orders (for two shipments)
  const order1 = await generate_random_ecommerce_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        shipping_recipient_name: RandomGenerator.name(),
        shipping_phone_number: RandomGenerator.mobile(),
        shipping_street_address: RandomGenerator.paragraph({ sentences: 2 }),
        shipping_city: RandomGenerator.name(),
        shipping_state: RandomGenerator.name(),
        shipping_postal_code: RandomGenerator.alphaNumeric(10),
        shipping_country: "South Korea",
      },
    },
  );
  typia.assert(order1);
  const order2 = await generate_random_ecommerce_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        shipping_recipient_name: RandomGenerator.name(),
        shipping_phone_number: RandomGenerator.mobile(),
        shipping_street_address: RandomGenerator.paragraph({ sentences: 2 }),
        shipping_city: RandomGenerator.name(),
        shipping_state: RandomGenerator.name(),
        shipping_postal_code: RandomGenerator.alphaNumeric(10),
        shipping_country: "South Korea",
      },
    },
  );
  typia.assert(order2);
  // 5. Seller creates two shipments (both initially undelivered)
  const shipment1 =
    await generate_random_ecommerce_mall_seller_shipments_create(
      sellerConnection,
      {
        body: {
          trackingNumber: RandomGenerator.alphaNumeric(15),
          carrierName: "Korea Post",
          shippedAt: new Date().toISOString(),
          orderItemIds: [order1.order_items[0].id],
        },
      },
    );
  typia.assert(shipment1);
  const shipment2 =
    await generate_random_ecommerce_mall_seller_shipments_create(
      sellerConnection,
      {
        body: {
          trackingNumber: RandomGenerator.alphaNumeric(15),
          carrierName: "CJ Logistics",
          shippedAt: new Date().toISOString(),
          orderItemIds: [order2.order_items[0].id],
        },
      },
    );
  typia.assert(shipment2);
  // 6. Customer confirms delivery on shipment1
  await api.functional.ecommerceMall.customer.orders.shipments.confirmDelivery(
    customerConnection,
    {
      orderId: order1.id,
      shipmentId: shipment1.id,
      body: {
        delivered_at: new Date().toISOString(),
      },
    },
  );
  // 7. Test filtering for undelivered shipments (no deliveredAt parameters)
  const undeliveredResult =
    await api.functional.ecommerceMall.seller.shipments.index(
      sellerConnection,
      {
        body: {},
      },
    );
  typia.assert(undeliveredResult);
  // Find undelivered shipments (delivered_at is null)
  const undeliveredShipments = undeliveredResult.data.filter(
    (s) => s.delivered_at === null,
  );
  TestValidator.equals(
    "undelivered shipments count",
    undeliveredShipments.length,
    1,
  );
  TestValidator.equals(
    "undelivered shipment ID",
    undeliveredShipments[0].id,
    shipment2.id,
  );
  // 8. Test filtering for delivered shipments using deliveredAt date range
  const deliveredResult =
    await api.functional.ecommerceMall.seller.shipments.index(
      sellerConnection,
      {
        body: {
          deliveredAtFrom: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
          deliveredAtTo: new Date(Date.now() + 86400000).toISOString(), // 1 day from now
        },
      },
    );
  typia.assert(deliveredResult);
  TestValidator.equals(
    "delivered shipments count",
    deliveredResult.data.length,
    1,
  );
  TestValidator.equals(
    "delivered shipment ID",
    deliveredResult.data[0].id,
    shipment1.id,
  );
  // 9. Test filtering by delivered_at date range (narrower range)
  const dateRangeResult =
    await api.functional.ecommerceMall.seller.shipments.index(
      sellerConnection,
      {
        body: {
          deliveredAtFrom: new Date().toISOString(),
          deliveredAtTo: new Date(Date.now() + 86400000).toISOString(),
        },
      },
    );
  typia.assert(dateRangeResult);
  TestValidator.equals(
    "date range filter count",
    dateRangeResult.data.length,
    1,
  );
  TestValidator.equals(
    "date range shipment ID",
    dateRangeResult.data[0].id,
    shipment1.id,
  );
}