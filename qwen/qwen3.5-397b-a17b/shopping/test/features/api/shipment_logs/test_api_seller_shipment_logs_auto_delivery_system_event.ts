import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShipmentLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipmentLog";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductOptionDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionDefinition";
import type { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import type { IShoppingMallProductRating } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductRating";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentItem";
import type { IShoppingMallShipmentLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentLog";
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
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

export async function test_api_seller_shipment_logs_auto_delivery_system_event(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup - store credentials, then register and login
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });
  // 2. Customer setup - store credentials, then register and login
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  const customerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(customerLoginConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
    } satisfies IShoppingMallCustomer.ILogin,
  });
  // 3. Seller creates product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerLoginConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 3 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 4. Seller creates product variant
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerLoginConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: RandomGenerator.alphaNumeric(12),
          price_override: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          option_value_ids: [],
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 5. Customer places order
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerLoginConnection,
    {
      body: {
        shopping_mall_address_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);
  // 6. Seller creates shipment for order items
  const orderItemIds = order.orderItems.map((item) => item.id);
  const shipment = await generate_random_shopping_mall_seller_shipments_create(
    sellerLoginConnection,
    {
      body: {
        tracking_carrier: RandomGenerator.pick(["FedEx", "UPS", "DHL", "USPS"]),
        tracking_number: RandomGenerator.alphaNumeric(16),
        order_item_ids: orderItemIds,
      } satisfies IShoppingMallShipment.ICreate,
    },
  );
  typia.assert(shipment);
  // 7. Retrieve shipment logs with various filters
  // Test basic retrieval
  const allLogs = await api.functional.shoppingMall.seller.shipment_logs.index(
    sellerLoginConnection,
    {
      body: {
        page: 1,
        limit: 20,
        sort: "created_at:DESC",
      } satisfies IShoppingMallShipmentLog.IRequest,
    },
  );
  typia.assert(allLogs);
  TestValidator.predicate("pagination valid", allLogs.pagination.current >= 1);
  // Test filtering by shipment ID
  const shipmentLogs =
    await api.functional.shoppingMall.seller.shipment_logs.index(
      sellerLoginConnection,
      {
        body: {
          shopping_mall_shipment_id: shipment.id,
          page: 1,
          limit: 20,
        } satisfies IShoppingMallShipmentLog.IRequest,
      },
    );
  typia.assert(shipmentLogs);
  TestValidator.predicate("shipment logs exist", shipmentLogs.data.length >= 1);
  // Verify all logs belong to the correct shipment
  for (const log of shipmentLogs.data) {
    TestValidator.equals(
      "log shipment ID matches",
      log.shipment.id,
      shipment.id,
    );
  }
  // Test filtering by actor_type='system' (for auto-delivery events)
  const systemLogs =
    await api.functional.shoppingMall.seller.shipment_logs.index(
      sellerLoginConnection,
      {
        body: {
          actor_type: "system",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallShipmentLog.IRequest,
      },
    );
  typia.assert(systemLogs);
  // Validate system log structure if any exist
  for (const log of systemLogs.data) {
    TestValidator.equals("system actor type", log.actorType, "system");
    TestValidator.predicate(
      "system actor ID is null",
      log.actorId === null || log.actorId === undefined,
    );
  }
  // Test filtering by event_type='auto_delivered'
  const autoDeliveredLogs =
    await api.functional.shoppingMall.seller.shipment_logs.index(
      sellerLoginConnection,
      {
        body: {
          event_type: "auto_delivered",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallShipmentLog.IRequest,
      },
    );
  typia.assert(autoDeliveredLogs);
  // Validate auto-delivered log structure if any exist
  for (const log of autoDeliveredLogs.data) {
    TestValidator.equals(
      "auto-delivered event type",
      log.eventType,
      "auto_delivered",
    );
    TestValidator.equals("auto-delivered actor type", log.actorType, "system");
    TestValidator.predicate(
      "auto-delivered actor ID is null",
      log.actorId === null || log.actorId === undefined,
    );
  }
  // Test combined filtering: actor_type='system' AND event_type='auto_delivered'
  const combinedLogs =
    await api.functional.shoppingMall.seller.shipment_logs.index(
      sellerLoginConnection,
      {
        body: {
          actor_type: "system",
          event_type: "auto_delivered",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallShipmentLog.IRequest,
      },
    );
  typia.assert(combinedLogs);
  // Validate combined filter results
  for (const log of combinedLogs.data) {
    TestValidator.equals("combined: actor type", log.actorType, "system");
    TestValidator.equals(
      "combined: event type",
      log.eventType,
      "auto_delivered",
    );
  }
  // Test date range filtering
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const dateRangeLogs =
    await api.functional.shoppingMall.seller.shipment_logs.index(
      sellerLoginConnection,
      {
        body: {
          created_at_from: oneDayAgo.toISOString(),
          created_at_to: now.toISOString(),
          page: 1,
          limit: 20,
        } satisfies IShoppingMallShipmentLog.IRequest,
      },
    );
  typia.assert(dateRangeLogs);
  // Test status transition filtering (shipped -> delivered)
  const statusTransitionLogs =
    await api.functional.shoppingMall.seller.shipment_logs.index(
      sellerLoginConnection,
      {
        body: {
          old_status: "shipped",
          new_status: "delivered",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallShipmentLog.IRequest,
      },
    );
  typia.assert(statusTransitionLogs);
  // Validate log entry structure completeness
  if (shipmentLogs.data.length > 0) {
    const sampleLog = shipmentLogs.data[0];
    TestValidator.predicate(
      "log has valid event type",
      [
        "created",
        "tracking_updated",
        "delivery_confirmed",
        "auto_delivered",
      ].includes(sampleLog.eventType),
    );
    TestValidator.predicate(
      "log has valid actor type",
      ["customer", "seller", "administrator", "system"].includes(
        sampleLog.actorType,
      ),
    );
    TestValidator.predicate(
      "log timestamp is valid",
      !isNaN(new Date(sampleLog.createdAt).getTime()),
    );
  }
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination has current page",
    allLogs.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has limit",
    allLogs.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination has records count",
    allLogs.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages count",
    allLogs.pagination.pages >= 0,
  );
}