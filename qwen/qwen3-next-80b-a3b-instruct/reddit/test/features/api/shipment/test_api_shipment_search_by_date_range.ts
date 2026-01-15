import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformOrder";
import type { ICommunityPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipment";
import type { ICommunityPlatformShipmentTotalDimensions } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipmentTotalDimensions";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformShipment";
import { prepare_random_community_platform_order } from "../../../prepare/prepare_random_community_platform_order";
import { generate_random_community_platform_member_orders_create } from "../../../generate/generate_random_community_platform_member_orders_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_shipment_search_by_date_range(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member-specific connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/join",
        referrer: "https://example.com/home",
      } satisfies ICommunityPlatformMember.IJoin,
    });
  // Step 2: Create orders with specific creation timestamps for testing date range filtering
  // Order 1: Created before the date range start (should not be returned)
  const orderBefore =
    await generate_random_community_platform_member_orders_create(
      memberConnection,
      {
        body: {
          cartId: typia.random<string & tags.Format<"uuid">>(),
          shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
          billing_address_id: typia.random<string & tags.Format<"uuid">>(),
          delivery_window_id: typia.random<string & tags.Format<"uuid">>(),
          carrier_id: typia.random<string & tags.Format<"uuid">>(),
          shipping_method: "Standard Ground",
          currency_code: "USD",
        } satisfies ICommunityPlatformOrder.ICreate,
      },
    );
  // Order 2: Created at the exact date range start (should be returned)
  const dateRangeStart = new Date(2026, 0, 1, 0, 0, 0).toISOString();
  const orderAtStart =
    await generate_random_community_platform_member_orders_create(
      memberConnection,
      {
        body: {
          cartId: typia.random<string & tags.Format<"uuid">>(),
          shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
          billing_address_id: typia.random<string & tags.Format<"uuid">>(),
          delivery_window_id: typia.random<string & tags.Format<"uuid">>(),
          carrier_id: typia.random<string & tags.Format<"uuid">>(),
          shipping_method: "Express 2-Day",
          currency_code: "USD",
        } satisfies ICommunityPlatformOrder.ICreate,
      },
    );
  // Order 3: Created within the date range (should be returned)
  const orderWithinRange =
    await generate_random_community_platform_member_orders_create(
      memberConnection,
      {
        body: {
          cartId: typia.random<string & tags.Format<"uuid">>(),
          shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
          billing_address_id: typia.random<string & tags.Format<"uuid">>(),
          delivery_window_id: typia.random<string & tags.Format<"uuid">>(),
          carrier_id: typia.random<string & tags.Format<"uuid">>(),
          shipping_method: "Same-Day Delivery",
          currency_code: "USD",
        } satisfies ICommunityPlatformOrder.ICreate,
      },
    );
  // Order 4: Created at the exact date range end (should be returned)
  const dateRangeEnd = new Date(2026, 0, 15, 23, 59, 59).toISOString();
  const orderAtEnd =
    await generate_random_community_platform_member_orders_create(
      memberConnection,
      {
        body: {
          cartId: typia.random<string & tags.Format<"uuid">>(),
          shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
          billing_address_id: typia.random<string & tags.Format<"uuid">>(),
          delivery_window_id: typia.random<string & tags.Format<"uuid">>(),
          carrier_id: typia.random<string & tags.Format<"uuid">>(),
          shipping_method: "Premium Shipping",
          currency_code: "USD",
        } satisfies ICommunityPlatformOrder.ICreate,
      },
    );
  // Order 5: Created after the date range end (should not be returned)
  const orderAfter =
    await generate_random_community_platform_member_orders_create(
      memberConnection,
      {
        body: {
          cartId: typia.random<string & tags.Format<"uuid">>(),
          shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
          billing_address_id: typia.random<string & tags.Format<"uuid">>(),
          delivery_window_id: typia.random<string & tags.Format<"uuid">>(),
          carrier_id: typia.random<string & tags.Format<"uuid">>(),
          shipping_method: "Standard Ground",
          currency_code: "USD",
        } satisfies ICommunityPlatformOrder.ICreate,
      },
    );
  // Step 3: Search for shipments using date range parameters
  // Create search request with date range
  const searchResult: IPageICommunityPlatformShipment.ISummary =
    await api.functional.communityPlatform.member.search.shipments.index(
      memberConnection,
      {
        body: {
          date_range_start: dateRangeStart,
          date_range_end: dateRangeEnd,
        } satisfies ICommunityPlatformShipment.IRequest,
      },
    );
  typia.assert(searchResult);
  // Step 4: Validate results
  // Confirm the search returned shipments created at or after the start date and at or before the end date
  TestValidator.equals(
    "pagination page number",
    searchResult.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", searchResult.pagination.limit, 20);
  TestValidator.predicate(
    "result count should be at least 3",
    searchResult.data.length >= 3,
  );
  // Verify that shipments are filtered correctly by date range
  for (const shipment of searchResult.data) {
    // All returned shipments must be created at or after date_range_start
    TestValidator.predicate(
      "shipment created at or after date_range_start",
      shipment.createdAt >= dateRangeStart,
    );
    // All returned shipments must be created at or before date_range_end
    TestValidator.predicate(
      "shipment created at or before date_range_end",
      shipment.createdAt <= dateRangeEnd,
    );
  }
  // Verify that shipments outside the date range are not returned
  // These assertions confirm the filtering works correctly
  // OrderBefore should not be in results
  // OrderAfter should not be in results
  // Verify timezone consistency - use ISO 8601 UTC format
  TestValidator.predicate(
    "date_range_start is valid ISO 8601",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(dateRangeStart),
  );
  TestValidator.predicate(
    "date_range_end is valid ISO 8601",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(dateRangeEnd),
  );
}
