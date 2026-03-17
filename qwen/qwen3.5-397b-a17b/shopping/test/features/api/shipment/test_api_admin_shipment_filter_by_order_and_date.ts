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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
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
 * Test administrator shipment filtering by order ID and date range.
 *
 * This test validates the admin shipment listing endpoint's filtering capabilities:
 * 1. Filter by order_id - returns only shipments for specific order
 * 2. Filter by date_from - returns shipments created on or after date
 * 3. Filter by date_to - returns shipments created on or before date
 * 4. Combined date range filtering
 * 5. Combined order_id + date filters (AND logic)
 * 6. Order summary correctness in shipment responses
 */
export async function test_api_admin_shipment_filter_by_order_and_date(
  connection: api.IConnection,
): Promise<void> {
  // =========================================================================
  // 1. SETUP: Create and authenticate all required actors
  // =========================================================================
  // Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Admin1234!" satisfies string & tags.Format<"password">,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: "192.168.1.1" satisfies string & tags.Format<"ipv4">,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Seller1234!" satisfies string & tags.Format<"password">,
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // Customer setup
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Customer1234!" satisfies string & tags.Format<"password">,
      nickname: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: "192.168.1.2" satisfies string & tags.Format<"ipv4">,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // =========================================================================
  // 2. DATA PREPARATION: Create products, orders, and shipments
  // =========================================================================
  // Seller creates product
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
  // Customer places order 1
  const order1 = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        addressId: typia.random<string & tags.Format<"uuid">>(),
      },
    },
  );
  typia.assert(order1);
  // Verify order1 has items before creating shipment
  TestValidator.predicate(
    "order1 has at least one item",
    () => order1.items.length > 0,
  );
  // Create shipment for order1
  const shipment1 = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        order_item_ids: order1.items.map((item) => item.id),
        tracking_carrier: "FedEx",
        tracking_number: RandomGenerator.alphaNumeric(12),
      },
    },
  );
  typia.assert(shipment1);
  // Small delay to ensure different timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));
  // Customer places order 2
  const order2 = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        addressId: typia.random<string & tags.Format<"uuid">>(),
      },
    },
  );
  typia.assert(order2);
  TestValidator.predicate(
    "order2 has at least one item",
    () => order2.items.length > 0,
  );
  // Create shipment for order2
  const shipment2 = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        order_item_ids: order2.items.map((item) => item.id),
        tracking_carrier: "UPS",
        tracking_number: RandomGenerator.alphaNumeric(12),
      },
    },
  );
  typia.assert(shipment2);
  // Small delay to ensure different timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));
  // Customer places order 3
  const order3 = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        addressId: typia.random<string & tags.Format<"uuid">>(),
      },
    },
  );
  typia.assert(order3);
  TestValidator.predicate(
    "order3 has at least one item",
    () => order3.items.length > 0,
  );
  // Create shipment for order3
  const shipment3 = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        order_item_ids: order3.items.map((item) => item.id),
        tracking_carrier: "DHL",
        tracking_number: RandomGenerator.alphaNumeric(12),
      },
    },
  );
  typia.assert(shipment3);
  // =========================================================================
  // 3. FILTER TESTS: Test all filtering combinations
  // =========================================================================
  // Test 1: Filter by order_id - should return only shipments for order1
  const orderByOrder1Result =
    await api.functional.shoppingMall.admin.shipments.index(adminConnection, {
      body: {
        order_id: order1.id,
        page: 1,
        limit: 10,
      } satisfies IShoppingMallShipment.IRequest,
    });
  typia.assert(orderByOrder1Result);
  TestValidator.predicate(
    "order_id filter returns shipments for specific order only",
    () =>
      orderByOrder1Result.data.every(
        (shipment) => shipment.order.id === order1.id,
      ),
  );
  TestValidator.predicate(
    "order_id filter returns at least one shipment",
    () => orderByOrder1Result.data.length >= 1,
  );
  // Test 2: Filter by order_id for order2 - should return only shipment2
  const orderByOrder2Result =
    await api.functional.shoppingMall.admin.shipments.index(adminConnection, {
      body: {
        order_id: order2.id,
        page: 1,
        limit: 10,
      } satisfies IShoppingMallShipment.IRequest,
    });
  typia.assert(orderByOrder2Result);
  TestValidator.predicate(
    "order_id filter for order2 returns correct shipments",
    () =>
      orderByOrder2Result.data.every(
        (shipment) => shipment.order.id === order2.id,
      ),
  );
  // Test 3: Filter by date_from - should return shipments created on or after date
  const dateFrom = new Date(shipment1.created_at);
  const dateFromResult =
    await api.functional.shoppingMall.admin.shipments.index(adminConnection, {
      body: {
        date_from: dateFrom.toISOString(),
        page: 1,
        limit: 10,
      } satisfies IShoppingMallShipment.IRequest,
    });
  typia.assert(dateFromResult);
  TestValidator.predicate(
    "date_from filter returns shipments on or after date",
    () =>
      dateFromResult.data.every((shipment) => {
        const shipmentDate = new Date(shipment.created_at);
        return shipmentDate.getTime() >= dateFrom.getTime();
      }),
  );
  // Test 4: Filter by date_to - should return shipments created on or before date
  const dateTo = new Date(shipment3.created_at);
  const dateToResult = await api.functional.shoppingMall.admin.shipments.index(
    adminConnection,
    {
      body: {
        date_to: dateTo.toISOString(),
        page: 1,
        limit: 10,
      } satisfies IShoppingMallShipment.IRequest,
    },
  );
  typia.assert(dateToResult);
  TestValidator.predicate(
    "date_to filter returns shipments on or before date",
    () =>
      dateToResult.data.every((shipment) => {
        const shipmentDate = new Date(shipment.created_at);
        return shipmentDate.getTime() <= dateTo.getTime();
      }),
  );
  // Test 5: Combined date_from and date_to - should return shipments within range
  const dateRangeResult =
    await api.functional.shoppingMall.admin.shipments.index(adminConnection, {
      body: {
        date_from: dateFrom.toISOString(),
        date_to: dateTo.toISOString(),
        page: 1,
        limit: 10,
      } satisfies IShoppingMallShipment.IRequest,
    });
  typia.assert(dateRangeResult);
  TestValidator.predicate(
    "combined date range filter returns shipments within range",
    () =>
      dateRangeResult.data.every((shipment) => {
        const shipmentDate = new Date(shipment.created_at);
        return (
          shipmentDate.getTime() >= dateFrom.getTime() &&
          shipmentDate.getTime() <= dateTo.getTime()
        );
      }),
  );
  // Test 6: Combined order_id + date_from + date_to (AND logic)
  const combinedFilterResult =
    await api.functional.shoppingMall.admin.shipments.index(adminConnection, {
      body: {
        order_id: order1.id,
        date_from: dateFrom.toISOString(),
        date_to: dateTo.toISOString(),
        page: 1,
        limit: 10,
      } satisfies IShoppingMallShipment.IRequest,
    });
  typia.assert(combinedFilterResult);
  TestValidator.predicate(
    "combined order_id and date filters apply AND logic",
    () =>
      combinedFilterResult.data.every((shipment) => {
        const shipmentDate = new Date(shipment.created_at);
        return (
          shipment.order.id === order1.id &&
          shipmentDate.getTime() >= dateFrom.getTime() &&
          shipmentDate.getTime() <= dateTo.getTime()
        );
      }),
  );
  // Test 7: Verify order summary in shipment responses
  TestValidator.predicate(
    "shipment order summary correctly identifies parent order",
    () =>
      orderByOrder1Result.data.every((shipment) => {
        return (
          shipment.order.id === order1.id &&
          shipment.order.orderNumber === order1.order_number
        );
      }),
  );
  // Test 8: Verify all shipments have valid order references
  const allShipmentsResult =
    await api.functional.shoppingMall.admin.shipments.index(adminConnection, {
      body: {
        page: 1,
        limit: 100,
      } satisfies IShoppingMallShipment.IRequest,
    });
  typia.assert(allShipmentsResult);
  TestValidator.predicate("all shipments have valid order references", () =>
    allShipmentsResult.data.every(
      (shipment) =>
        typeof shipment.order.id === "string" &&
        typeof shipment.order.orderNumber === "string" &&
        shipment.order.id.length > 0 &&
        shipment.order.orderNumber.length > 0,
    ),
  );
  // Test 9: Verify pagination metadata is present and valid
  TestValidator.predicate(
    "pagination metadata is present in response",
    () =>
      allShipmentsResult.pagination.current >= 1 &&
      allShipmentsResult.pagination.limit >= 1 &&
      allShipmentsResult.pagination.records >= 0 &&
      allShipmentsResult.pagination.pages >= 0,
  );
  // Test 10: Verify shipment tracking information is present
  TestValidator.predicate("shipments have tracking carrier and number", () =>
    allShipmentsResult.data.every(
      (shipment) =>
        typeof shipment.tracking_carrier === "string" &&
        typeof shipment.tracking_number === "string",
    ),
  );
  // Test 11: Verify shipment timestamps are valid
  TestValidator.predicate("shipments have valid created_at timestamps", () =>
    allShipmentsResult.data.every(
      (shipment) =>
        typeof shipment.created_at === "string" &&
        !isNaN(new Date(shipment.created_at).getTime()),
    ),
  );
  // Test 12: Verify shipments have valid IDs
  TestValidator.predicate("shipments have valid UUID format IDs", () =>
    allShipmentsResult.data.every(
      (shipment) =>
        typeof shipment.id === "string" &&
        shipment.id.length === 36 &&
        shipment.id.includes("-"),
    ),
  );
}
