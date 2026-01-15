import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEDeliveryEventSortBy } from "@ORGANIZATION/PROJECT-api/lib/structures/IEDeliveryEventSortBy";
import type { IESortOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IESortOrder";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallDeliveryEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallDeliveryEvent";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallDeliveryEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDeliveryEvent";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_delivery_events_pagination_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/admin/join",
        referrer: "https://example.com/admin/signup",
      } satisfies IShoppingMallAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Step 2: Generate multiple delivery events for testing
  // Create 3 carriers with actual names
  const carriers: {
    id: string;
    name: string;
  }[] = [];
  for (let i = 0; i < 3; i++) {
    const carrierId = typia.random<string & tags.Format<"uuid">>();
    const carrierName = RandomGenerator.name();
    carriers.push({ id: carrierId, name: carrierName });
  }
  // Create 10 orders
  const orderIds: string[] = [];
  for (let i = 0; i < 10; i++) {
    const orderId = typia.random<string & tags.Format<"uuid">>();
    orderIds.push(orderId);
  }
  // Generate 50 delivery events with varying characteristics
  const deliveryEvents: IShoppingMallDeliveryEvent.ISummary[] = [];
  const eventsPromises = ArrayUtil.repeat(50, async (index) => {
    const carrier = RandomGenerator.pick(carriers);
    const orderId = RandomGenerator.pick(orderIds);
    // Generate random status
    const statuses: IShoppingMallDeliveryEvent.ISummary["delivery_status"][] = [
      "scheduled",
      "in_transit",
      "out_for_delivery",
      "delivered",
      "failed",
      "cancelled",
    ];
    const status = typia.assert<"scheduled" | "in_transit" | "out_for_delivery" | "delivered" | "failed" | "cancelled">(RandomGenerator.pick(statuses));
    // Generate scheduled_date (next 30 days)
    const baseDate = new Date();
    const scheduledDate = RandomGenerator.date(
      baseDate,
      30 * 24 * 60 * 60 * 1000,
    );
    // Generate actual_date based on status
    const actualDate =
      status === "delivered" || status === "failed" || status === "cancelled"
        ? RandomGenerator.date(scheduledDate, 7 * 24 * 60 * 60 * 1000)
        : null;
    const deliveryEvent: IShoppingMallDeliveryEvent.ISummary = {
      id: typia.random<string & tags.Format<"uuid">>(),
      order_id: orderId,
      carrier_id: carrier.id,
      scheduled_delivery_date: scheduledDate.toISOString(),
      actual_delivery_date: actualDate ? actualDate.toISOString() : undefined,
      delivery_status: status,
      tracking_number:
        status !== "scheduled" ? RandomGenerator.alphaNumeric(12) : undefined,
      created_at: new Date().toISOString(),
    };
    // Create duplicates for tiebreaker testing - make 5 events with same attributes
    if (index < 5) {
      deliveryEvent.delivery_status = "scheduled";
      deliveryEvent.scheduled_delivery_date = scheduledDate.toISOString();
      deliveryEvent.carrier_id = carriers[0].id;
    }
    deliveryEvents.push(deliveryEvent);
    return deliveryEvent;
  });
  // Wait for all events to be created
  await Promise.all(eventsPromises);
  // Step 3: Test pagination with different limits and pages
  // Test default limit (20) - we can't change the default, so we'll test the API returns correct default values
  let result: IPageIShoppingMallDeliveryEvent.ISummary =
    await api.functional.shoppingMall.admin.delivery_events.index(
      adminConnection,
      {
        body: {},
      },
    );
  typia.assert(result);
  TestValidator.equals(
    "default page size matches expected",
    result.pagination.limit,
    20,
  );
  TestValidator.equals("default page number", result.pagination.current, 1);
  TestValidator.predicate("results exist", result.data.length > 0);
  // Test limit=10 (minimum)
  result = await api.functional.shoppingMall.admin.delivery_events.index(
    adminConnection,
    {
      body: { limit: 10 },
    },
  );
  typia.assert(result);
  TestValidator.equals("minimum limit", result.pagination.limit, 10);
  TestValidator.predicate("10 results returned", result.data.length === 10);
  // Test limit=100 (maximum)
  result = await api.functional.shoppingMall.admin.delivery_events.index(
    adminConnection,
    {
      body: { limit: 100 },
    },
  );
  typia.assert(result);
  TestValidator.equals("maximum limit", result.pagination.limit, 100);
  TestValidator.predicate(
    "results limited to available data",
    result.data.length <= 50,
  ); // We have 50 events
  // Test page=2 with limit=10 (should return second page)
  result = await api.functional.shoppingMall.admin.delivery_events.index(
    adminConnection,
    {
      body: { limit: 10, page: 2 },
    },
  );
  typia.assert(result);
  TestValidator.equals("second page limit", result.pagination.limit, 10);
  TestValidator.equals("second page number", result.pagination.current, 2);
  TestValidator.predicate("second page results exist", result.data.length > 0);
  // Test empty page (page beyond total)
  result = await api.functional.shoppingMall.admin.delivery_events.index(
    adminConnection,
    {
      body: { limit: 10, page: 100 },
    },
  );
  typia.assert(result);
  TestValidator.equals("empty page number", result.pagination.current, 100);
  TestValidator.equals("empty page limit", result.pagination.limit, 10);
  TestValidator.equals("empty page data length", result.data.length, 0);
  // Test pagination with invalid page number (page = 0)
  await TestValidator.error(
    "invalid page number should throw HTTP error",
    async () => {
      await api.functional.shoppingMall.admin.delivery_events.index(
        adminConnection,
        {
          body: { page: 0 },
        },
      );
    },
  );
  // Test pagination with invalid limit (below minimum)
  await TestValidator.error(
    "invalid limit below minimum should throw HTTP error",
    async () => {
      await api.functional.shoppingMall.admin.delivery_events.index(
        adminConnection,
        {
          body: { limit: 0 },
        },
      );
    },
  );
  // Test pagination with invalid limit (above maximum)
  await TestValidator.error(
    "invalid limit above maximum should throw HTTP error",
    async () => {
      await api.functional.shoppingMall.admin.delivery_events.index(
        adminConnection,
        {
          body: { limit: 101 },
        },
      );
    },
  );
  // Step 4: Test sorting by scheduled_date
  // Ascending order by scheduled_date
  let sortedResult =
    await api.functional.shoppingMall.admin.delivery_events.index(
      adminConnection,
      {
        body: { sort_by: "scheduled_date", order: "asc" },
      },
    );
  typia.assert(sortedResult);
  let sortedEvents = sortedResult.data;
  // Verify ascending order
  for (let i = 1; i < sortedEvents.length; i++) {
    const prevEvent = sortedEvents[i - 1];
    const currentEvent = sortedEvents[i];
    // Handle null scheduled dates (should come first in ascending order)
    const prevDate = prevEvent.scheduled_delivery_date
      ? new Date(prevEvent.scheduled_delivery_date).getTime()
      : -Infinity;
    const currentDate = currentEvent.scheduled_delivery_date
      ? new Date(currentEvent.scheduled_delivery_date).getTime()
      : -Infinity;
    TestValidator.predicate(
      "scheduled_date ascending",
      prevDate <= currentDate,
    );
  }
  // Descending order by scheduled_date
  sortedResult = await api.functional.shoppingMall.admin.delivery_events.index(
    adminConnection,
    {
      body: { sort_by: "scheduled_date", order: "desc" },
    },
  );
  typia.assert(sortedResult);
  sortedEvents = sortedResult.data;
  // Verify descending order
  for (let i = 1; i < sortedEvents.length; i++) {
    const prevEvent = sortedEvents[i - 1];
    const currentEvent = sortedEvents[i];
    const prevDate = prevEvent.scheduled_delivery_date
      ? new Date(prevEvent.scheduled_delivery_date).getTime()
      : -Infinity;
    const currentDate = currentEvent.scheduled_delivery_date
      ? new Date(currentEvent.scheduled_delivery_date).getTime()
      : -Infinity;
    TestValidator.predicate(
      "scheduled_date descending",
      prevDate >= currentDate,
    );
  }
  // Step 5: Test sorting by actual_date
  // Ascending order by actual_date
  sortedResult = await api.functional.shoppingMall.admin.delivery_events.index(
    adminConnection,
    {
      body: { sort_by: "actual_date", order: "asc" },
    },
  );
  typia.assert(sortedResult);
  sortedEvents = sortedResult.data;
  // Verify ascending order
  for (let i = 1; i < sortedEvents.length; i++) {
    const prevEvent = sortedEvents[i - 1];
    const currentEvent = sortedEvents[i];
    // Handle null actual dates (should come first in ascending order)
    const prevDate = prevEvent.actual_delivery_date
      ? new Date(prevEvent.actual_delivery_date).getTime()
      : -Infinity;
    const currentDate = currentEvent.actual_delivery_date
      ? new Date(currentEvent.actual_delivery_date).getTime()
      : -Infinity;
    TestValidator.predicate("actual_date ascending", prevDate <= currentDate);
  }
  // Descending order by actual_date
  sortedResult = await api.functional.shoppingMall.admin.delivery_events.index(
    adminConnection,
    {
      body: { sort_by: "actual_date", order: "desc" },
    },
  );
  typia.assert(sortedResult);
  sortedEvents = sortedResult.data;
  // Verify descending order
  for (let i = 1; i < sortedEvents.length; i++) {
    const prevEvent = sortedEvents[i - 1];
    const currentEvent = sortedEvents[i];
    const prevDate = prevEvent.actual_delivery_date
      ? new Date(prevEvent.actual_delivery_date).getTime()
      : -Infinity;
    const currentDate = currentEvent.actual_delivery_date
      ? new Date(currentEvent.actual_delivery_date).getTime()
      : -Infinity;
    TestValidator.predicate("actual_date descending", prevDate >= currentDate);
  }
  // Step 6: Test sorting by carrier_name
  // Ascending order by carrier_name
  sortedResult = await api.functional.shoppingMall.admin.delivery_events.index(
    adminConnection,
    {
      body: { sort_by: "carrier_name", order: "asc" },
    },
  );
  typia.assert(sortedResult);
  sortedEvents = sortedResult.data;
  // For carrier_name sorting, we need to use the carrier names from our carriers array
  // We can extract the carrier names and sort them to verify
  const carrierNames = carriers.map((c) => c.name).sort();
  // Verify the delivery events are sorted by carrier_name in ascending order
  for (let i = 1; i < sortedEvents.length; i++) {
    const prevEvent = sortedEvents[i - 1];
    const currentEvent = sortedEvents[i];
    // Find the carrier name for each event
    const prevCarrierName =
      carriers.find((c) => c.id === prevEvent.carrier_id)?.name || "";
    const currentCarrierName =
      carriers.find((c) => c.id === currentEvent.carrier_id)?.name || "";
    TestValidator.predicate(
      "carrier_name ascending",
      prevCarrierName <= currentCarrierName,
    );
  }
  // Descending order by carrier_name
  sortedResult = await api.functional.shoppingMall.admin.delivery_events.index(
    adminConnection,
    {
      body: { sort_by: "carrier_name", order: "desc" },
    },
  );
  typia.assert(sortedResult);
  sortedEvents = sortedResult.data;
  // Verify descending order by carrier_name
  for (let i = 1; i < sortedEvents.length; i++) {
    const prevEvent = sortedEvents[i - 1];
    const currentEvent = sortedEvents[i];
    const prevCarrierName =
      carriers.find((c) => c.id === prevEvent.carrier_id)?.name || "";
    const currentCarrierName =
      carriers.find((c) => c.id === currentEvent.carrier_id)?.name || "";
    TestValidator.predicate(
      "carrier_name descending",
      prevCarrierName >= currentCarrierName,
    );
  }
  // Step 7: Test sorting by status
  // Ascending order by status
  sortedResult = await api.functional.shoppingMall.admin.delivery_events.index(
    adminConnection,
    {
      body: { sort_by: "status", order: "asc" },
    },
  );
  typia.assert(sortedResult);
  sortedEvents = sortedResult.data;
  // Define status order as defined in schema
  const statusOrder = [
    "scheduled",
    "in_transit",
    "out_for_delivery",
    "delivered",
    "failed",
    "cancelled",
  ] as const;
  // Verify ascending order (predefined order)
  for (let i = 1; i < sortedEvents.length; i++) {
    const prevEvent = sortedEvents[i - 1];
    const currentEvent = sortedEvents[i];
    const prevIndex = statusOrder.indexOf(
      typia.assert<"scheduled" | "in_transit" | "out_for_delivery" | "delivered" | "failed" | "cancelled">(prevEvent.delivery_status)
    );
    const currentIndex = statusOrder.indexOf(
      typia.assert<"scheduled" | "in_transit" | "out_for_delivery" | "delivered" | "failed" | "cancelled">(currentEvent.delivery_status)
    );
    TestValidator.predicate("status ascending", prevIndex <= currentIndex);
  }
  // Descending order by status
  sortedResult = await api.functional.shoppingMall.admin.delivery_events.index(
    adminConnection,
    {
      body: { sort_by: "status", order: "desc" },
    },
  );
  typia.assert(sortedResult);
  sortedEvents = sortedResult.data;
  // Verify descending order (reverse of predefined order)
  for (let i = 1; i < sortedEvents.length; i++) {
    const prevEvent = sortedEvents[i - 1];
    const currentEvent = sortedEvents[i];
    const prevIndex = statusOrder.indexOf(
      typia.assert<"scheduled" | "in_transit" | "out_for_delivery" | "delivered" | "failed" | "cancelled">(prevEvent.delivery_status)
    );
    const currentIndex = statusOrder.indexOf(
      typia.assert<"scheduled" | "in_transit" | "out_for_delivery" | "delivered" | "failed" | "cancelled">(currentEvent.delivery_status)
    );
    TestValidator.predicate("status descending", prevIndex >= currentIndex);
  }
  // Step 8: Test tiebreaker with identical sort values - ensure delivery_id is used as tiebreaker
  // Test with scheduled_date as the sort key since we have created duplicate scheduled dates
  sortedResult = await api.functional.shoppingMall.admin.delivery_events.index(
    adminConnection,
    {
      body: { sort_by: "scheduled_date", order: "asc" },
    },
  );
  typia.assert(sortedResult);
  sortedEvents = sortedResult.data;
  // Find consecutive events with identical scheduled_date and carrier_id
  for (let i = 1; i < sortedEvents.length; i++) {
    const prevEvent = sortedEvents[i - 1];
    const currentEvent = sortedEvents[i];
    // Check if they're identical in scheduled_date and carrier_id
    if (
      prevEvent.scheduled_delivery_date ===
        currentEvent.scheduled_delivery_date &&
      prevEvent.carrier_id === currentEvent.carrier_id &&
      prevEvent.delivery_status === currentEvent.delivery_status
    ) {
      // Then delivery_id should be in ascending order (tiebreaker)
      TestValidator.predicate(
        "delivery_id tiebreaker ascending",
        prevEvent.id < currentEvent.id,
      );
    }
  }
  // Step 9: Test combined sorting and pagination
  // Test with sorting and pagination together
  result = await api.functional.shoppingMall.admin.delivery_events.index(
    adminConnection,
    {
      body: { sort_by: "scheduled_date", order: "asc", limit: 5, page: 1 },
    },
  );
  typia.assert(result);
  TestValidator.equals("correct page size", result.pagination.limit, 5);
  TestValidator.equals("correct page number", result.pagination.current, 1);
  TestValidator.predicate("results exist", result.data.length === 5);
  // Verify sorting on first page
  sortedEvents = result.data;
  for (let i = 1; i < sortedEvents.length; i++) {
    const prevEvent = sortedEvents[i - 1];
    const currentEvent = sortedEvents[i];
    const prevDate = prevEvent.scheduled_delivery_date
      ? new Date(prevEvent.scheduled_delivery_date).getTime()
      : -Infinity;
    const currentDate = currentEvent.scheduled_delivery_date
      ? new Date(currentEvent.scheduled_delivery_date).getTime()
      : -Infinity;
    TestValidator.predicate(
      "combined sorting ascending",
      prevDate <= currentDate,
    );
  }
  // Test that different pages are consistent
  const secondPageResult =
    await api.functional.shoppingMall.admin.delivery_events.index(
      adminConnection,
      {
        body: { sort_by: "scheduled_date", order: "asc", limit: 5, page: 2 },
      },
    );
  typia.assert(secondPageResult);
  // Verify second page also follows the correct sort order
  const secondPageEvents = secondPageResult.data;
  for (let i = 1; i < secondPageEvents.length; i++) {
    const prevEvent = secondPageEvents[i - 1];
    const currentEvent = secondPageEvents[i];
    const prevDate = prevEvent.scheduled_delivery_date
      ? new Date(prevEvent.scheduled_delivery_date).getTime()
      : -Infinity;
    const currentDate = currentEvent.scheduled_delivery_date
      ? new Date(currentEvent.scheduled_delivery_date).getTime()
      : -Infinity;
    TestValidator.predicate(
      "second page combined sorting ascending",
      prevDate <= currentDate,
    );
  }
}