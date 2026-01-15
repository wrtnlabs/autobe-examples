import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShippingTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShippingTracking";
import type { IShoppingMallShippingTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingTracking";
export async function test_api_shipping_tracking_retrieval_by_order_id(
  connection: api.IConnection,
): Promise<void> {
  // Query shipping tracking records to get an order ID from existing data
  const initialResponse =
    await api.functional.shoppingMall.shipping_trackings._patch(connection, {
      body: {
        page: 1,
        limit: 10,
      } satisfies IShoppingMallShippingTracking.IRequest,
    });
  typia.assert(initialResponse);
  // Verify that we have at least one record to test with
  TestValidator.predicate(
    "at least one shipping tracking record exists",
    initialResponse.data.length > 0,
  );
  // Extract order_id from the first tracking record
  const testOrderId = initialResponse.data[0].order_id;
  // Retrieve shipping tracks by order ID (positive case)
  const trackingResponse =
    await api.functional.shoppingMall.shipping_trackings._patch(connection, {
      body: {
        page: 1,
        limit: 10,
        orderId: testOrderId,
      } satisfies IShoppingMallShippingTracking.IRequest,
    });
  typia.assert(trackingResponse);
  // Verify that all returned records belong to the specified order
  TestValidator.equals(
    "pagination is correct",
    trackingResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is correct",
    trackingResponse.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "at least one record returned for the order",
    trackingResponse.data.length > 0,
  );
  // Verify that every returned record's order_id matches the test order ID
  trackingResponse.data.forEach((tracking) => {
    TestValidator.equals(
      "tracking record order_id matches the test order",
      tracking.order_id,
      testOrderId,
    );
  });
  // Verify sorting by tracking number (ascending)
  const sortedByTrackingAsc =
    await api.functional.shoppingMall.shipping_trackings._patch(connection, {
      body: {
        page: 1,
        limit: 10,
        orderId: testOrderId,
        sort: "trackingNumber",
        order: "asc",
      } satisfies IShoppingMallShippingTracking.IRequest,
    });
  typia.assert(sortedByTrackingAsc);
  TestValidator.equals(
    "sorted by tracking number ascending result count",
    sortedByTrackingAsc.data.length,
    trackingResponse.data.length,
  );
  // Verify sorting by tracking number (descending)
  const sortedByTrackingDesc =
    await api.functional.shoppingMall.shipping_trackings._patch(connection, {
      body: {
        page: 1,
        limit: 10,
        orderId: testOrderId,
        sort: "trackingNumber",
        order: "desc",
      } satisfies IShoppingMallShippingTracking.IRequest,
    });
  typia.assert(sortedByTrackingDesc);
  TestValidator.equals(
    "sorted by tracking number descending result count",
    sortedByTrackingDesc.data.length,
    trackingResponse.data.length,
  );
  // Validate pagination with limit
  const limitedResponse =
    await api.functional.shoppingMall.shipping_trackings._patch(connection, {
      body: {
        page: 1,
        limit: 1, // Only get one result
        orderId: testOrderId,
      } satisfies IShoppingMallShippingTracking.IRequest,
    });
  typia.assert(limitedResponse);
  TestValidator.equals("limit is 1", limitedResponse.pagination.limit, 1);
  TestValidator.equals("one record returned", limitedResponse.data.length, 1);
  TestValidator.equals(
    "first record matches",
    limitedResponse.data[0].order_id,
    testOrderId,
  );
  // Validate with invalid UUID format order ID
  await TestValidator.error(
    "should throw 400 for invalid UUID format",
    async () => {
      await api.functional.shoppingMall.shipping_trackings._patch(connection, {
        body: {
          page: 1,
          limit: 10,
          orderId: "not-a-uuid", // Invalid UUID format
        } satisfies IShoppingMallShippingTracking.IRequest,
      });
    },
  );
  // Validate with non-existent but valid UUID format order ID
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  const emptyResponse =
    await api.functional.shoppingMall.shipping_trackings._patch(connection, {
      body: {
        page: 1,
        limit: 10,
        orderId: nonExistentId,
      } satisfies IShoppingMallShippingTracking.IRequest,
    });
  typia.assert(emptyResponse);
  TestValidator.equals(
    "empty response count",
    emptyResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty response pages",
    emptyResponse.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty response data length",
    emptyResponse.data.length,
    0,
  );
}
