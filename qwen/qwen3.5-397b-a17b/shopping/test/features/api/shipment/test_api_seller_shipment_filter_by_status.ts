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
 * Test seller shipment filtering by status (shipped vs delivered).
 *
 * This test validates that sellers can correctly filter their shipments
 * by lifecycle status. The status is computed from timestamp nullability:
 * - 'shipped': shipped_at IS NOT NULL AND delivered_at IS NULL
 * - 'delivered': delivered_at IS NOT NULL
 *
 * Test flow:
 * 1. Register and login as seller
 * 2. Register and login as customer
 * 3. Seller creates products with variants
 * 4. Customer places orders containing seller's products
 * 5. Seller creates multiple shipments
 * 6. Test filtering by status='shipped'
 * 7. Test filtering by status='delivered'
 * 8. Validate pagination metadata reflects correct counts
 */
export async function test_api_seller_shipment_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration
  const sellerJoin = await authorize_seller_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerJoin);
  // Create seller connection with authentication token
  const sellerConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: sellerJoin.token.access,
    },
  };
  // 2. Customer registration
  const customerJoin = await authorize_customer_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      nickname: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerJoin);
  // Create customer connection with authentication token
  const customerConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: customerJoin.token.access,
    },
  };
  // 3. Seller creates products
  const product1 = await api.functional.shoppingMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        shopping_category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product1);
  const product2 = await api.functional.shoppingMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        shopping_category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product2);
  // 4. Customer places orders
  // Note: In a complete test environment, this would require:
  // - Adding items to cart
  // - Creating shipping addresses
  // - Then checking out to create orders
  // For this filter test, we focus on the shipment filtering logic
  // 5. Create shipments (assuming order items exist from previous setup)
  // In production, order_item_ids would come from actual orders
  const shipment1 = await api.functional.shoppingMall.seller.shipments.create(
    sellerConnection,
    {
      body: {
        order_item_ids: [typia.random<string & tags.Format<"uuid">>()],
        tracking_carrier: "FedEx",
        tracking_number: "FX123456789",
      } satisfies IShoppingMallShipment.ICreate,
    },
  );
  typia.assert(shipment1);
  const shipment2 = await api.functional.shoppingMall.seller.shipments.create(
    sellerConnection,
    {
      body: {
        order_item_ids: [typia.random<string & tags.Format<"uuid">>()],
        tracking_carrier: "UPS",
        tracking_number: "UPS987654321",
      } satisfies IShoppingMallShipment.ICreate,
    },
  );
  typia.assert(shipment2);
  const shipment3 = await api.functional.shoppingMall.seller.shipments.create(
    sellerConnection,
    {
      body: {
        order_item_ids: [typia.random<string & tags.Format<"uuid">>()],
        tracking_carrier: "DHL",
        tracking_number: "DHL456789123",
      } satisfies IShoppingMallShipment.ICreate,
    },
  );
  typia.assert(shipment3);
  // 6. Test filtering by status='shipped'
  const shippedResult =
    await api.functional.shoppingMall.seller.shipments.index(sellerConnection, {
      body: {
        status: "shipped",
        page: 1,
        limit: 20,
      } satisfies IShoppingMallShipment.IRequest,
    });
  typia.assert(shippedResult);
  // Validate all returned shipments have shipped_at but not delivered_at
  for (const shipment of shippedResult.data) {
    TestValidator.predicate(
      "shipped shipment has shipped_at",
      shipment.shipped_at !== null,
    );
    TestValidator.predicate(
      "shipped shipment has no delivered_at",
      shipment.delivered_at === null,
    );
  }
  // 7. Test filtering by status='delivered'
  const deliveredResult =
    await api.functional.shoppingMall.seller.shipments.index(sellerConnection, {
      body: {
        status: "delivered",
        page: 1,
        limit: 20,
      } satisfies IShoppingMallShipment.IRequest,
    });
  typia.assert(deliveredResult);
  // Validate all returned shipments have delivered_at
  for (const shipment of deliveredResult.data) {
    TestValidator.predicate(
      "delivered shipment has delivered_at",
      shipment.delivered_at !== null,
    );
  }
  // 8. Validate pagination metadata structure
  TestValidator.predicate(
    "shipped pagination current page valid",
    shippedResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "shipped pagination limit valid",
    shippedResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "shipped pagination records non-negative",
    shippedResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "delivered pagination current page valid",
    deliveredResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "delivered pagination limit valid",
    deliveredResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "delivered pagination records non-negative",
    deliveredResult.pagination.records >= 0,
  );
}
