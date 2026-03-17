import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
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
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { generate_random_ecommerce_mall_customer_orders_create } from "../../../generate/generate_random_ecommerce_mall_customer_orders_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { generate_random_ecommerce_mall_seller_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_shipments_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

export async function test_api_shipment_list_filter_by_tracking_number(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Create product (using random UUID for category_id)
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
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Create variant
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: typia.random<string & tags.Format<"uuid">>(),
          optionValues: [
            { key: "color", value: RandomGenerator.name(1) },
          ] satisfies IEcommerceMallProductVariantOption[],
          stockQuantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10>
          >(),
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 4. Create and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: null,
      phone_number: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 5. Customer adds variant to cart
  await generate_random_ecommerce_mall_customer_cart_items_create(
    customerConnection,
    {
      body: {
        product_variant_id: variant.id,
        quantity: 1,
      } satisfies IEcommerceMallCartItem.ICreate,
    },
  );
  // 6. Customer places order
  const order = await generate_random_ecommerce_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        shipping_recipient_name: RandomGenerator.name(),
        shipping_phone_number: RandomGenerator.mobile(),
        shipping_street_address: RandomGenerator.paragraph({ sentences: 2 }),
        shipping_city: RandomGenerator.name(1),
        shipping_state: RandomGenerator.name(1),
        shipping_postal_code: typia.random<string & tags.MaxLength<10>>(),
        shipping_country: "South Korea",
      } satisfies IEcommerceMallOrder.ICreate,
    },
  );
  typia.assert(order);
  // 7. Create three shipments with different tracking numbers
  const shipment1 =
    await generate_random_ecommerce_mall_seller_shipments_create(
      sellerConnection,
      {
        body: {
          trackingNumber: `ABC123-${RandomGenerator.alphaNumeric(8)}`,
          carrierName: "FedEx",
          shippedAt: new Date().toISOString(),
          orderItemIds: [order.order_items[0].id],
        } satisfies IEcommerceMallShipment.ICreate,
      },
    );
  typia.assert(shipment1);
  const shipment2 =
    await generate_random_ecommerce_mall_seller_shipments_create(
      sellerConnection,
      {
        body: {
          trackingNumber: `XYZ789-${RandomGenerator.alphaNumeric(8)}`,
          carrierName: "UPS",
          shippedAt: new Date().toISOString(),
          orderItemIds: [order.order_items[0].id],
        } satisfies IEcommerceMallShipment.ICreate,
      },
    );
  typia.assert(shipment2);
  const shipment3 =
    await generate_random_ecommerce_mall_seller_shipments_create(
      sellerConnection,
      {
        body: {
          trackingNumber: `DEF456-${RandomGenerator.alphaNumeric(8)}`,
          carrierName: "DHL",
          shippedAt: new Date().toISOString(),
          orderItemIds: [order.order_items[0].id],
        } satisfies IEcommerceMallShipment.ICreate,
      },
    );
  typia.assert(shipment3);
  // 8. Filter by "abc" (case-insensitive) - should return shipment1
  const filteredByAbc =
    await api.functional.ecommerceMall.seller.shipments.index(
      sellerConnection,
      {
        body: {
          trackingNumber: "abc",
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallShipment.IRequest,
      },
    );
  typia.assert(filteredByAbc);
  TestValidator.equals(
    "filter abc returns 1 result",
    filteredByAbc.data.length,
    1,
  );
  TestValidator.predicate(
    "filter abc returns shipment with ABC123",
    filteredByAbc.data[0].tracking_number.toUpperCase().includes("ABC123"),
  );
  // 9. Filter by "xyz" (case-insensitive) - should return shipment2
  const filteredByXyz =
    await api.functional.ecommerceMall.seller.shipments.index(
      sellerConnection,
      {
        body: {
          trackingNumber: "xyz",
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallShipment.IRequest,
      },
    );
  typia.assert(filteredByXyz);
  TestValidator.equals(
    "filter xyz returns 1 result",
    filteredByXyz.data.length,
    1,
  );
  TestValidator.predicate(
    "filter xyz returns shipment with XYZ789",
    filteredByXyz.data[0].tracking_number.toUpperCase().includes("XYZ789"),
  );
  // 10. Filter by "def" (case-insensitive) - should return shipment3
  const filteredByDef =
    await api.functional.ecommerceMall.seller.shipments.index(
      sellerConnection,
      {
        body: {
          trackingNumber: "def",
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallShipment.IRequest,
      },
    );
  typia.assert(filteredByDef);
  TestValidator.equals(
    "filter def returns 1 result",
    filteredByDef.data.length,
    1,
  );
  TestValidator.predicate(
    "filter def returns shipment with DEF456",
    filteredByDef.data[0].tracking_number.toUpperCase().includes("DEF456"),
  );
  // 11. Verify no false positives - filter by "nonexistent" should return empty
  const filteredByNonexistent =
    await api.functional.ecommerceMall.seller.shipments.index(
      sellerConnection,
      {
        body: {
          trackingNumber: "nonexistent",
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallShipment.IRequest,
      },
    );
  typia.assert(filteredByNonexistent);
  TestValidator.equals(
    "filter nonexistent returns 0 results",
    filteredByNonexistent.data.length,
    0,
  );
}
