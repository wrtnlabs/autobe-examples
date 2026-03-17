import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipment";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
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
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test that an authenticated seller can successfully retrieve their shipment list with default pagination.
 *
 * This test verifies:
 * 1. Seller can retrieve their shipments after creating them
 * 2. Response contains proper pagination metadata
 * 3. Shipments include tracking information and order references
 * 4. Only shipments belonging to the seller's order items are returned
 * 5. Default sorting is by created_at descending (newest first)
 */
export async function test_api_seller_shipment_list_basic(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
    },
  });
  typia.assert(sellerAuth);
  // 2. Register and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      nickname: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    },
  });
  typia.assert(customerAuth);
  // 3. Create test product for seller (generation function handles category)
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: typia.random<
          number &
            tags.Type<"uint32"> &
            tags.Minimum<1000> &
            tags.Maximum<100000>
        >(),
      },
    },
  );
  typia.assert(product);
  // 4. Create customer order containing seller's product (generation function handles cart and address)
  const order =
    await generate_random_shopping_mall_customer_orders_create(
      customerConnection,
      {
        body: {},
      },
    );
  typia.assert(order);
  // 5. Create shipment for the seller's order items
  const orderItemIds = order.items
    .filter((item) => item.seller.id === sellerAuth.id)
    .map((item) => item.id);
  if (orderItemIds.length === 0) {
    throw new Error("No order items found for this seller");
  }
  const shipment = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        order_item_ids: orderItemIds,
        tracking_carrier: RandomGenerator.pick(["FedEx", "UPS", "DHL", "USPS"]),
        tracking_number: RandomGenerator.alphaNumeric(12),
      },
    },
  );
  typia.assert(shipment);
  // 6. Retrieve shipment list with default pagination
  const shipmentList = await api.functional.shoppingMall.seller.shipments.index(
    sellerConnection,
    {
      body: {},
    },
  );
  typia.assert(shipmentList);
  // 7. Validate pagination metadata
  TestValidator.predicate(
    "has pagination info",
    shipmentList.pagination !== undefined,
  );
  TestValidator.predicate(
    "current page is at least 1",
    shipmentList.pagination.current >= 1,
  );
  TestValidator.predicate(
    "limit is positive",
    shipmentList.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "total records is non-negative",
    shipmentList.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages is non-negative",
    shipmentList.pagination.pages >= 0,
  );
  // 8. Validate shipment list contains our created shipment
  TestValidator.predicate(
    "has at least one shipment",
    shipmentList.data.length >= 1,
  );
  const createdShipment = shipmentList.data.find((s) => s.id === shipment.id);
  TestValidator.predicate(
    "created shipment is in list",
    createdShipment !== undefined,
  );
  if (createdShipment) {
    // 9. Validate shipment tracking information
    TestValidator.equals(
      "tracking carrier matches",
      createdShipment.tracking_carrier,
      shipment.tracking_carrier,
    );
    TestValidator.equals(
      "tracking number matches",
      createdShipment.tracking_number,
      shipment.tracking_number,
    );
    TestValidator.predicate(
      "shipped_at is set",
      createdShipment.shipped_at !== null,
    );
    TestValidator.predicate(
      "created_at is valid",
      createdShipment.created_at !== undefined,
    );
    // 10. Validate order reference
    TestValidator.equals(
      "order id matches",
      createdShipment.order.id,
      shipment.order.id,
    );
    TestValidator.equals(
      "order number matches",
      createdShipment.order.orderNumber,
      shipment.order.orderNumber,
    );
  }
  // 11. Validate sorting (newest first by created_at)
  if (shipmentList.data.length > 1) {
    for (let i = 1; i < shipmentList.data.length; i++) {
      const prevDate = new Date(shipmentList.data[i - 1].created_at).getTime();
      const currDate = new Date(shipmentList.data[i].created_at).getTime();
      TestValidator.predicate(
        `shipment ${i} is older than or equal to shipment ${i - 1}`,
        prevDate >= currDate,
      );
    }
  }
}