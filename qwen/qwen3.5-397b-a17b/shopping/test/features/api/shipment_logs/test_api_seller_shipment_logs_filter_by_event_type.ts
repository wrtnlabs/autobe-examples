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

/**
 * Test filtering shipment logs by event type.
 *
 * This test validates the shipment log filtering capability by:
 * 1. Setting up seller and customer accounts
 * 2. Creating products and variants
 * 3. Customer placing orders
 * 4. Seller creating shipments (generates 'created' events)
 * 5. Seller updating tracking (generates 'tracking_updated' events)
 * 6. Customer confirming delivery (generates 'delivery_confirmed' events)
 * 7. Filtering logs by each event type and validating results
 * 8. Testing pagination with filters
 * 9. Testing combined filters (event_type + shipment_id)
 */
export async function test_api_seller_shipment_logs_filter_by_event_type(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 3. Seller creates product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
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
  // 4. Seller creates variant
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        body: {
          sku_code: RandomGenerator.alphaNumeric(12),
          price_override: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          option_value_ids: [],
        } satisfies IShoppingMallProductVariant.ICreate,
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // 5. Customer creates order
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        shopping_mall_address_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);
  // Get order items from this seller
  const sellerOrderItems = order.orderItems.filter(
    (item) => item.seller.id === sellerAuth.id,
  );
  TestValidator.predicate(
    "has seller order items",
    sellerOrderItems.length > 0,
  );
  // 6. Seller creates first shipment
  const shipment1 = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        tracking_carrier: "FedEx",
        tracking_number: RandomGenerator.alphaNumeric(20),
        order_item_ids: sellerOrderItems.slice(0, 1).map((item) => item.id),
      } satisfies IShoppingMallShipment.ICreate,
    },
  );
  typia.assert(shipment1);
  // 7. Seller creates second shipment with different items
  const remainingItems =
    sellerOrderItems.length > 1
      ? sellerOrderItems.slice(1)
      : sellerOrderItems.slice(0, 1);
  const shipment2 = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        tracking_carrier: "UPS",
        tracking_number: RandomGenerator.alphaNumeric(20),
        order_item_ids: remainingItems.map((item) => item.id),
      } satisfies IShoppingMallShipment.ICreate,
    },
  );
  typia.assert(shipment2);
  // 8. Seller updates tracking for shipment1 (generates tracking_updated event)
  const updatedShipment1 =
    await api.functional.shoppingMall.seller.shipments.update(
      sellerConnection,
      {
        shipmentId: shipment1.id,
        body: {
          trackingCarrier: "DHL",
          trackingNumber: RandomGenerator.alphaNumeric(25),
        } satisfies IShoppingMallShipment.IUpdate,
      },
    );
  typia.assert(updatedShipment1);
  // 9. Customer confirms delivery for shipment1 (generates delivery_confirmed event)
  const confirmedShipment1 =
    await api.functional.shoppingMall.customer.shipments.confirm_delivery.confirmDelivery(
      customerConnection,
      {
        shipmentId: shipment1.id,
      },
    );
  typia.assert(confirmedShipment1);
  // 10. Test filtering by event_type='created'
  const createdLogs =
    await api.functional.shoppingMall.seller.shipment_logs.index(
      sellerConnection,
      {
        body: {
          event_type: "created",
          page: 1,
          limit: 100,
        } satisfies IShoppingMallShipmentLog.IRequest,
      },
    );
  typia.assert(createdLogs);
  TestValidator.predicate("has created events", createdLogs.data.length > 0);
  // 11. Test filtering by event_type='tracking_updated'
  const trackingUpdatedLogs =
    await api.functional.shoppingMall.seller.shipment_logs.index(
      sellerConnection,
      {
        body: {
          event_type: "tracking_updated",
          page: 1,
          limit: 100,
        } satisfies IShoppingMallShipmentLog.IRequest,
      },
    );
  typia.assert(trackingUpdatedLogs);
  TestValidator.predicate(
    "has tracking_updated events",
    trackingUpdatedLogs.data.length > 0,
  );
  // 12. Test filtering by event_type='delivery_confirmed'
  const deliveryConfirmedLogs =
    await api.functional.shoppingMall.seller.shipment_logs.index(
      sellerConnection,
      {
        body: {
          event_type: "delivery_confirmed",
          page: 1,
          limit: 100,
        } satisfies IShoppingMallShipmentLog.IRequest,
      },
    );
  typia.assert(deliveryConfirmedLogs);
  TestValidator.predicate(
    "has delivery_confirmed events",
    deliveryConfirmedLogs.data.length > 0,
  );
  // 13. Test filtering by event_type='auto_delivered' (may have zero results)
  const autoDeliveredLogs =
    await api.functional.shoppingMall.seller.shipment_logs.index(
      sellerConnection,
      {
        body: {
          event_type: "auto_delivered",
          page: 1,
          limit: 100,
        } satisfies IShoppingMallShipmentLog.IRequest,
      },
    );
  typia.assert(autoDeliveredLogs);
  // 14. Test filtering by shipment_id + event_type combination
  const shipment1Logs =
    await api.functional.shoppingMall.seller.shipment_logs.index(
      sellerConnection,
      {
        body: {
          shopping_mall_shipment_id: shipment1.id,
          page: 1,
          limit: 100,
        } satisfies IShoppingMallShipmentLog.IRequest,
      },
    );
  typia.assert(shipment1Logs);
  TestValidator.predicate(
    "has logs for shipment1",
    shipment1Logs.data.length > 0,
  );
  // 15. Test filtering by shipment_id + specific event_type
  const shipment1CreatedLogs =
    await api.functional.shoppingMall.seller.shipment_logs.index(
      sellerConnection,
      {
        body: {
          shopping_mall_shipment_id: shipment1.id,
          event_type: "created",
          page: 1,
          limit: 100,
        } satisfies IShoppingMallShipmentLog.IRequest,
      },
    );
  typia.assert(shipment1CreatedLogs);
  TestValidator.predicate(
    "has created logs for shipment1",
    shipment1CreatedLogs.data.length > 0,
  );
  // 16. Test pagination with filter
  const paginatedLogs =
    await api.functional.shoppingMall.seller.shipment_logs.index(
      sellerConnection,
      {
        body: {
          event_type: "created",
          page: 1,
          limit: 1,
        } satisfies IShoppingMallShipmentLog.IRequest,
      },
    );
  typia.assert(paginatedLogs);
  TestValidator.predicate(
    "pagination respects limit",
    paginatedLogs.data.length <= 1,
  );
  // 17. Verify shipment-specific filtering returns correct shipment
  const shipment2Logs =
    await api.functional.shoppingMall.seller.shipment_logs.index(
      sellerConnection,
      {
        body: {
          shopping_mall_shipment_id: shipment2.id,
          page: 1,
          limit: 100,
        } satisfies IShoppingMallShipmentLog.IRequest,
      },
    );
  typia.assert(shipment2Logs);
  TestValidator.predicate(
    "has logs for shipment2",
    shipment2Logs.data.length > 0,
  );
  shipment2Logs.data.forEach((log) => {
    TestValidator.equals(
      "shipment id matches shipment2",
      log.shipment.id,
      shipment2.id,
    );
  });
}
