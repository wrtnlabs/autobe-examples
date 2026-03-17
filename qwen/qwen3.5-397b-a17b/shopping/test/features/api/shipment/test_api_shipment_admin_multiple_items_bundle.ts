import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductReviewStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewStatistic";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_customer_customers_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_customers_cart_items_create";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option } from "../../../prepare/prepare_random_shopping_mall_product_variant_option";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test administrator retrieval of a shipment containing multiple order items from the same seller.
 *
 * This test validates the shipment bundling workflow:
 * 1. Admin, seller, and customer accounts are created
 * 2. Seller creates two products with variants
 * 3. Customer adds both variants to cart and places a single order
 * 4. Seller creates a shipment bundling both order items together with shared tracking
 * 5. Admin retrieves the shipment and validates all items are included with shared tracking info
 */
export async function test_api_shipment_admin_multiple_items_bundle(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);
  // 3. Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      nickname: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 4. Seller creates first product
  const product1 = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        shopping_category_id: typia.random<string & tags.Format<"uuid">>(),
      },
    },
  );
  typia.assert(product1);
  // 5. Seller creates variant for first product
  const variant1 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product1.id },
        body: {
          sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          stock_quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10>
          >(),
          options: [
            {
              key: "color",
              value: RandomGenerator.pick(["Red", "Blue", "Green"]),
            },
          ],
        },
      },
    );
  typia.assert(variant1);
  // 6. Seller creates second product
  const product2 = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        shopping_category_id: typia.random<string & tags.Format<"uuid">>(),
      },
    },
  );
  typia.assert(product2);
  // 7. Seller creates variant for second product
  const variant2 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product2.id },
        body: {
          sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          stock_quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10>
          >(),
          options: [
            {
              key: "size",
              value: RandomGenerator.pick(["Small", "Medium", "Large"]),
            },
          ],
        },
      },
    );
  typia.assert(variant2);
  // 8. Customer adds first variant to cart
  const cartItem1 =
    await generate_random_shopping_mall_customer_customers_cart_items_create(
      customerConnection,
      {
        body: {
          shopping_mall_product_variant_id: variant1.id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<3>
          >(),
        },
      },
    );
  typia.assert(cartItem1);
  // 9. Customer adds second variant to cart
  const cartItem2 =
    await generate_random_shopping_mall_customer_customers_cart_items_create(
      customerConnection,
      {
        body: {
          shopping_mall_product_variant_id: variant2.id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<3>
          >(),
        },
      },
    );
  typia.assert(cartItem2);
  // 10. Customer places order with both items
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        addressId: typia.random<string & tags.Format<"uuid">>(),
      },
    },
  );
  typia.assert(order);
  // Validate order has multiple items from same seller
  TestValidator.predicate(
    "order has multiple items",
    () => order.items.length >= 2,
  );
  // Get order item IDs for shipment
  const orderItemIds = order.items.map((item) => item.id);
  // 11. Seller creates shipment bundling all order items together
  const shipment = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        order_item_ids: orderItemIds,
        tracking_carrier: RandomGenerator.pick(["FedEx", "UPS", "DHL", "USPS"]),
        tracking_number: `TRACK-${RandomGenerator.alphaNumeric(12)}`,
      },
    },
  );
  typia.assert(shipment);
  // 12. Admin retrieves the shipment
  const adminShipment = await api.functional.shoppingMall.admin.shipments.at(
    adminConnection,
    {
      shipmentId: shipment.id,
    },
  );
  typia.assert(adminShipment);
  // 13. Validate shipment contains all order items
  TestValidator.equals(
    "shipment item count matches order",
    adminShipment.items.length,
    order.items.length,
  );
  // 14. Validate all items share same tracking information
  TestValidator.equals(
    "tracking carrier matches",
    adminShipment.tracking_carrier,
    shipment.tracking_carrier,
  );
  TestValidator.equals(
    "tracking number matches",
    adminShipment.tracking_number,
    shipment.tracking_number,
  );
  // 15. Validate all items are from the same seller
  const sellerIds = new Set(adminShipment.items.map((item) => item.seller.id));
  TestValidator.predicate(
    "all items from same seller",
    () => sellerIds.size === 1,
  );
  // 16. Validate each item has product and variant snapshots
  for (const item of adminShipment.items) {
    TestValidator.predicate(
      "item has product snapshot",
      () => item.productSnapshot !== undefined,
    );
    TestValidator.predicate(
      "item has variant snapshot",
      () => item.productVariantSnapshot !== undefined,
    );
    TestValidator.predicate(
      "item has seller info",
      () => item.seller !== undefined,
    );
  }
  // 17. Validate shipment is linked to correct order
  TestValidator.equals(
    "shipment order matches",
    adminShipment.order.id,
    order.id,
  );
}
