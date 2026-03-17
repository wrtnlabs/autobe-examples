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
import type { IShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentItem";
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
 * Test the edge case where a seller attempts to retrieve an order item that does not belong to the specified shipment, expecting a 404 error.
 *
 * Setup Requirements:
 * 1. Seller account created and authenticated
 * 2. Seller creates two different products, each with variants
 * 3. Customer account created and authenticated
 * 4. Customer places an order containing both product variants (two order items)
 * 5. Seller creates Shipment A containing only the first order item
 * 6. Seller creates Shipment B containing only the second order item (separate shipment)
 *
 * Test Execution:
 * 1. Seller calls GET /seller/shipments/{shipmentAId}/items/{itemBId} using Shipment A's ID but Order Item B's ID
 * 2. Verify response returns 404 status code (shipment item linkage not found)
 *
 * Business Logic Validation:
 * - System correctly validates that the order item belongs to the specified shipment
 * - Returns 404 when the specific linkage record does not exist in shopping_mall_shipment_items
 * - Prevents sellers from accessing order items through wrong shipment references
 */
export async function test_api_seller_shipment_item_not_in_shipment_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup - create and login
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoin = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "test1234",
      shop_name: RandomGenerator.name(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerJoin);
  // Seller login to get fresh token
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerJoin.email,
      password: "test1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });
  // 2. Seller creates two products using utility function
  const product1 = await generate_random_shopping_mall_seller_products_create(
    sellerLoginConnection,
    {
      body: {
        name: RandomGenerator.name(),
        base_price: 10000,
      },
    },
  );
  typia.assert(product1);
  const product2 = await generate_random_shopping_mall_seller_products_create(
    sellerLoginConnection,
    {
      body: {
        name: RandomGenerator.name(),
        base_price: 15000,
      },
    },
  );
  typia.assert(product2);
  // 3. Seller creates variants for both products using utility function
  const variant1 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerLoginConnection,
      {
        params: { productId: product1.id },
        body: {
          sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          stock_quantity: 100,
          options: [{ key: "color", value: "Red" }],
        },
      },
    );
  typia.assert(variant1);
  const variant2 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerLoginConnection,
      {
        params: { productId: product2.id },
        body: {
          sku_code: `SKU-${RandomGenerator.alphaNumeric(9)}`,
          stock_quantity: 100,
          options: [{ key: "size", value: "Large" }],
        },
      },
    );
  typia.assert(variant2);
  // 4. Customer setup - create and login
  const customerConnection: api.IConnection = { host: connection.host };
  const customerJoin = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "test1234",
      nickname: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerJoin);
  // Customer login
  const customerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(customerLoginConnection, {
    body: {
      email: customerJoin.email,
      password: "test1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IShoppingMallCustomer.ILogin,
  });
  // 5. Customer adds both variants to cart using utility function
  await generate_random_shopping_mall_customer_customers_cart_items_create(
    customerLoginConnection,
    {
      body: {
        shopping_mall_product_variant_id: variant1.id,
        quantity: 1,
      },
    },
  );
  await generate_random_shopping_mall_customer_customers_cart_items_create(
    customerLoginConnection,
    {
      body: {
        shopping_mall_product_variant_id: variant2.id,
        quantity: 1,
      },
    },
  );
  // 6. Customer places order using utility function (creates two order items)
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerLoginConnection,
    {
      body: {
        addressId: typia.random<string & tags.Format<"uuid">>(),
      },
    },
  );
  typia.assert(order);
  // Get the two order items from the order
  const orderItem1 = order.items[0];
  const orderItem2 = order.items[1];
  // 7. Seller creates two separate shipments using utility function
  const shipment1 = await generate_random_shopping_mall_seller_shipments_create(
    sellerLoginConnection,
    {
      body: {
        order_item_ids: [orderItem1.id],
        tracking_carrier: "TestCarrier",
        tracking_number: "TRACK001",
      },
    },
  );
  typia.assert(shipment1);
  const shipment2 = await generate_random_shopping_mall_seller_shipments_create(
    sellerLoginConnection,
    {
      body: {
        order_item_ids: [orderItem2.id],
        tracking_carrier: "TestCarrier",
        tracking_number: "TRACK002",
      },
    },
  );
  typia.assert(shipment2);
  // 8. Test: Seller tries to get order item 2 from shipment 1 (wrong linkage)
  // This should return 404 because orderItem2 belongs to shipment2, not shipment1
  await TestValidator.error("shipment item not found", async () => {
    await api.functional.shoppingMall.seller.shipments.items.at(
      sellerLoginConnection,
      {
        shipmentId: shipment1.id,
        itemId: orderItem2.id,
      },
    );
  });
}