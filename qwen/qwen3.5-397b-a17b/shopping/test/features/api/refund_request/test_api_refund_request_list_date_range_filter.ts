import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundRequest";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
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
import { generate_random_shopping_mall_customer_refund_requests_create } from "../../../generate/generate_random_shopping_mall_customer_refund_requests_create";
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test refund request list date range filtering.
 *
 * This test verifies that customers can filter their refund requests by:
 * 1. Request submission date range (requestedAtFrom/requestedAtTo)
 * 2. Delivery date range (deliveredAtFrom/deliveredAtTo)
 * 3. Combined filters (status + date ranges)
 * 4. Pagination with filtered results
 */
export async function test_api_refund_request_list_date_range_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      nickname: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 2. Seller registration and authentication (needed for order fulfillment)
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph(),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 3. Create multiple orders for the customer
  const order1 = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {},
  );
  typia.assert(order1);
  const order2 = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {},
  );
  typia.assert(order2);
  // 4. Seller creates shipments for orders (to enable delivery confirmation)
  const orderItemIds1 = order1.items.map((item) => item.id);
  const orderItemIds2 = order2.items.map((item) => item.id);
  const shipment1 = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        order_item_ids: orderItemIds1,
        tracking_carrier: "TestCarrier",
        tracking_number: RandomGenerator.alphaNumeric(16),
      } satisfies IShoppingMallShipment.ICreate,
    },
  );
  typia.assert(shipment1);
  const shipment2 = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        order_item_ids: orderItemIds2,
        tracking_carrier: "TestCarrier",
        tracking_number: RandomGenerator.alphaNumeric(16),
      } satisfies IShoppingMallShipment.ICreate,
    },
  );
  typia.assert(shipment2);
  // 5. Customer confirms delivery for shipments
  const confirmedShipment1 =
    await api.functional.shoppingMall.customer.shipments.confirm_delivery.confirmDelivery(
      customerConnection,
      {
        shipmentId: shipment1.id,
      },
    );
  typia.assert(confirmedShipment1);
  const confirmedShipment2 =
    await api.functional.shoppingMall.customer.shipments.confirm_delivery.confirmDelivery(
      customerConnection,
      {
        shipmentId: shipment2.id,
      },
    );
  typia.assert(confirmedShipment2);
  // 6. Create refund requests for delivered order items
  const orderItem1 = order1.items[0];
  const orderItem2 = order2.items[0];
  const refundRequest1 =
    await generate_random_shopping_mall_customer_refund_requests_create(
      customerConnection,
      {
        body: {
          order_item_id: orderItem1.id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IShoppingMallRefundRequest.ICreate,
      },
    );
  typia.assert(refundRequest1);
  const refundRequest2 =
    await generate_random_shopping_mall_customer_refund_requests_create(
      customerConnection,
      {
        body: {
          order_item_id: orderItem2.id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IShoppingMallRefundRequest.ICreate,
      },
    );
  typia.assert(refundRequest2);
  // 7. Test filtering by requestedAt date range
  const allRequests =
    await api.functional.shoppingMall.customer.refund_requests.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IShoppingMallRefundRequest.IRequest,
      },
    );
  typia.assert(allRequests);
  // Test with wide date range that should include all requests
  const wideRangeFilter =
    await api.functional.shoppingMall.customer.refund_requests.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 100,
          requestedAtFrom: "2020-01-01T00:00:00Z",
          requestedAtTo: "2030-12-31T23:59:59Z",
        } satisfies IShoppingMallRefundRequest.IRequest,
      },
    );
  typia.assert(wideRangeFilter);
  TestValidator.predicate(
    "wide date range includes all requests",
    wideRangeFilter.data.length >= allRequests.data.length,
  );
  // Test with narrow date range that should exclude recent requests
  const narrowRangeFilter =
    await api.functional.shoppingMall.customer.refund_requests.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 100,
          requestedAtFrom: "2020-01-01T00:00:00Z",
          requestedAtTo: "2020-12-31T23:59:59Z",
        } satisfies IShoppingMallRefundRequest.IRequest,
      },
    );
  typia.assert(narrowRangeFilter);
  TestValidator.equals(
    "narrow date range excludes recent requests",
    narrowRangeFilter.data.length,
    0,
  );
  // 8. Test filtering by deliveredAt date range
  const deliveredAtFilter =
    await api.functional.shoppingMall.customer.refund_requests.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 100,
          deliveredAtFrom: "2020-01-01T00:00:00Z",
          deliveredAtTo: "2030-12-31T23:59:59Z",
        } satisfies IShoppingMallRefundRequest.IRequest,
      },
    );
  typia.assert(deliveredAtFilter);
  TestValidator.predicate(
    "deliveredAt filter returns results",
    deliveredAtFilter.data.length > 0,
  );
  // 9. Test combined filters (status + date ranges)
  const combinedFilter =
    await api.functional.shoppingMall.customer.refund_requests.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 100,
          status: "PENDING",
          requestedAtFrom: "2020-01-01T00:00:00Z",
          requestedAtTo: "2030-12-31T23:59:59Z",
          deliveredAtFrom: "2020-01-01T00:00:00Z",
          deliveredAtTo: "2030-12-31T23:59:59Z",
        } satisfies IShoppingMallRefundRequest.IRequest,
      },
    );
  typia.assert(combinedFilter);
  // Verify all returned requests match the filter criteria
  for (const request of combinedFilter.data) {
    TestValidator.equals("status matches filter", request.status, "PENDING");
    TestValidator.predicate(
      "requested_at within range",
      request.requested_at >= "2020-01-01T00:00:00Z" &&
        request.requested_at <= "2030-12-31T23:59:59Z",
    );
    TestValidator.predicate(
      "delivered_at within range",
      request.delivered_at >= "2020-01-01T00:00:00Z" &&
        request.delivered_at <= "2030-12-31T23:59:59Z",
    );
  }
  // 10. Test pagination with filters
  const paginatedFilter =
    await api.functional.shoppingMall.customer.refund_requests.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 1,
          requestedAtFrom: "2020-01-01T00:00:00Z",
          requestedAtTo: "2030-12-31T23:59:59Z",
        } satisfies IShoppingMallRefundRequest.IRequest,
      },
    );
  typia.assert(paginatedFilter);
  TestValidator.predicate(
    "pagination limit respected",
    paginatedFilter.data.length <= 1,
  );
  TestValidator.predicate(
    "pagination metadata present",
    paginatedFilter.pagination.current >= 1 &&
      paginatedFilter.pagination.limit >= 1 &&
      paginatedFilter.pagination.records >= 0 &&
      paginatedFilter.pagination.pages >= 0,
  );
}
