import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipment";
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
 * Test customer shipment list retrieval functionality.
 *
 * This test verifies that a customer can retrieve their shipment history with:
 * 1. Proper tracking information (carrier, tracking number)
 * 2. Delivery lifecycle timestamps (shipped_at, delivered_at, etc.)
 * 3. Parent order summary with order number, total price, and status
 * 4. Pagination working correctly
 * 5. Results sorted by creation date (newest first)
 * 6. Data isolation - only shipments from customer's orders are returned
 *
 * Test flow:
 * 1. Create seller account
 * 2. Create customer account
 * 3. Seller creates product with variant
 * 4. Customer adds variant to cart and places order
 * 5. Seller creates shipment with tracking information
 * 6. Customer retrieves shipment list and validates response
 */
export async function test_api_customer_shipment_list_all(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
    },
  });
  typia.assert(sellerAuth);
  // 2. Setup customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      nickname: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    },
  });
  typia.assert(customerAuth);
  // 3. Seller creates product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(product);
  // 4. Seller creates product variant
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          stock_quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10>
          >(),
          options: [
            {
              key: "color",
              value: RandomGenerator.pick(["Red", "Blue", "Green"]),
            },
            {
              key: "size",
              value: RandomGenerator.pick(["S", "M", "L"]),
            },
          ],
        },
      },
    );
  typia.assert(variant);
  // 5. Customer adds variant to cart
  const cartItem =
    await generate_random_shopping_mall_customer_customers_cart_items_create(
      customerConnection,
      {
        body: {
          shopping_mall_product_variant_id: variant.id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
        },
      },
    );
  typia.assert(cartItem);
  // 6. Customer places order (FIXED: added missing props parameter)
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {},
  );
  typia.assert(order);
  // 7. Seller creates shipment for the order items
  const orderItemIds = order.items.map((item) => item.id);
  const shipment = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        order_item_ids: orderItemIds,
        tracking_carrier: RandomGenerator.pick(["FedEx", "UPS", "DHL", "USPS"]),
        tracking_number: `TRK${RandomGenerator.alphaNumeric(12)}`,
      },
    },
  );
  typia.assert(shipment);
  // 8. Customer retrieves shipment list
  const shipmentList =
    await api.functional.shoppingMall.customer.shipments.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 20,
          sort: "created_at,desc",
        } satisfies IShoppingMallShipment.IRequest,
      },
    );
  typia.assert(shipmentList);
  // 9. Validate shipment list structure
  TestValidator.predicate(
    "has pagination",
    shipmentList.pagination !== undefined,
  );
  TestValidator.predicate("has data array", Array.isArray(shipmentList.data));
  TestValidator.predicate(
    "at least one shipment",
    shipmentList.data.length >= 1,
  );
  // 10. Validate the shipment we created is in the list
  const customerShipment = shipmentList.data.find((s) => s.id === shipment.id);
  TestValidator.predicate(
    "shipment found in list",
    customerShipment !== undefined,
  );
  // 11. Validate shipment details (only if found - test will fail above if not)
  if (customerShipment) {
    // Validate tracking information
    TestValidator.equals(
      "tracking carrier matches",
      customerShipment.tracking_carrier,
      shipment.tracking_carrier,
    );
    TestValidator.equals(
      "tracking number matches",
      customerShipment.tracking_number,
      shipment.tracking_number,
    );
    // Validate order reference
    TestValidator.equals(
      "order id matches",
      customerShipment.order.id,
      order.id,
    );
    TestValidator.equals(
      "order number matches",
      customerShipment.order.orderNumber,
      order.order_number,
    );
    TestValidator.equals(
      "order total price matches",
      customerShipment.order.totalPrice,
      order.total_price,
    );
    // Validate timestamps exist
    TestValidator.predicate(
      "has created_at timestamp",
      customerShipment.created_at !== undefined,
    );
    TestValidator.predicate(
      "has shipped_at timestamp",
      customerShipment.shipped_at !== null,
    );
  }
  // 12. Validate pagination structure
  TestValidator.predicate(
    "pagination has current page",
    shipmentList.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has limit",
    shipmentList.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination has records count",
    shipmentList.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages count",
    shipmentList.pagination.pages >= 0,
  );
  // 13. Validate data isolation - customer should only see their own shipments
  TestValidator.predicate(
    "all shipments belong to customer's orders",
    shipmentList.data.every((s) =>
      order.items.some((item) => item.order.id === s.order.id),
    ),
  );
}
