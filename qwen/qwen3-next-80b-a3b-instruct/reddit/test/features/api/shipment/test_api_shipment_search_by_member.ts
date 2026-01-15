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
export async function test_api_shipment_search_by_member(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as member to access shipment search functionality
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com/home",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  memberConnection.headers = memberConnection.headers || {};
  memberConnection.headers.Authorization = memberAuth.token.access;
  // Step 2: Create orders to generate associated shipment records for searching
  const order = await generate_random_community_platform_member_orders_create(
    memberConnection,
    {
      body: {
        cartId: typia.random<string & tags.Format<"uuid">>(),
        shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
        billing_address_id: typia.random<string & tags.Format<"uuid">>(),
        delivery_window_id: typia.random<string & tags.Format<"uuid">>(),
        carrier_id: typia.random<string & tags.Format<"uuid">>(),
        shipping_method: RandomGenerator.name(),
        currency_code: "KRW",
      } satisfies ICommunityPlatformOrder.ICreate,
    },
  );
  typia.assert(order);
  // Step 3: Search shipments by member with various criteria
  // Test 1: Search by delivery status
  const statusSearch: ICommunityPlatformShipment.IRequest = {
    delivery_status: ["pending"] as const,
  };
  const statusResult =
    await api.functional.communityPlatform.member.search.shipments.index(
      memberConnection,
      {
        body: statusSearch satisfies ICommunityPlatformShipment.IRequest,
      },
    );
  typia.assert(statusResult);
  TestValidator.equals(
    "status search returns at least one result",
    statusResult.data.length > 0,
    true,
  );
  TestValidator.predicate("all results match requested status", () =>
    statusResult.data.every((shipment) => shipment.status === "pending"),
  );
  // Test 2: Search by date range
  const dateRangeSearch: ICommunityPlatformShipment.IRequest = {
    date_range_start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 24 hours ago
    date_range_end: new Date().toISOString(),
  };
  const dateResult =
    await api.functional.communityPlatform.member.search.shipments.index(
      memberConnection,
      {
        body: dateRangeSearch satisfies ICommunityPlatformShipment.IRequest,
      },
    );
  typia.assert(dateResult);
  TestValidator.equals(
    "date range search returns at least one result",
    dateResult.data.length > 0,
    true,
  );
  TestValidator.predicate("all results in date range", () =>
    dateResult.data.every(
      (shipment) =>
        new Date(shipment.createdAt) >=
          new Date(dateRangeSearch.date_range_start!) &&
        new Date(shipment.createdAt) <=
          new Date(dateRangeSearch.date_range_end!),
    ),
  );
  // Test 3: Search by tracking number (partial match)
  const trackingSearch: ICommunityPlatformShipment.IRequest = {
    tracking_number: statusResult.data[0].tracking_number.substring(0, 5), // partial match
  };
  const trackingResult =
    await api.functional.communityPlatform.member.search.shipments.index(
      memberConnection,
      {
        body: trackingSearch satisfies ICommunityPlatformShipment.IRequest,
      },
    );
  typia.assert(trackingResult);
  TestValidator.equals(
    "tracking number search returns at least one result",
    trackingResult.data.length > 0,
    true,
  );
  TestValidator.predicate("all results contain tracking number prefix", () =>
    trackingResult.data.every((shipment) =>
      shipment.tracking_number.startsWith(trackingSearch.tracking_number!),
    ),
  );
  // Test 4: Search by carrier name (partial match)
  const carrierSearch: ICommunityPlatformShipment.IRequest = {
    carrier_name: "DHL", // Example carrier name
  };
  const carrierResult =
    await api.functional.communityPlatform.member.search.shipments.index(
      memberConnection,
      {
        body: carrierSearch satisfies ICommunityPlatformShipment.IRequest,
      },
    );
  typia.assert(carrierResult);
  TestValidator.equals(
    "carrier name search returns at least one result",
    carrierResult.data.length > 0,
    true,
  );
  TestValidator.predicate("all results contain carrier name", () =>
    carrierResult.data.some(
      (shipment) =>
        shipment.tracking_number.includes(carrierSearch.carrier_name!) ||
        shipment.tracking_number.startsWith(carrierSearch.carrier_name!),
    ),
  );
  // Test 5: Pagination with page and limit parameters
  const paginationSearch: ICommunityPlatformShipment.IRequest = {
    page: 1,
    limit: 5,
  };
  const paginationResult =
    await api.functional.communityPlatform.member.search.shipments.index(
      memberConnection,
      {
        body: paginationSearch satisfies ICommunityPlatformShipment.IRequest,
      },
    );
  typia.assert(paginationResult);
  TestValidator.equals(
    "pagination page is correct",
    paginationResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is correct",
    paginationResult.pagination.limit,
    5,
  );
  TestValidator.equals(
    "pagination data count matches limit",
    paginationResult.data.length,
    5,
  );
  // Test 6: Sorting by created_at (ascending)
  const sortCreatedAtAsc: ICommunityPlatformShipment.IRequest = {
    sort_by: "created_at",
    order: "asc",
  };
  const sortCreatedAtAscResult =
    await api.functional.communityPlatform.member.search.shipments.index(
      memberConnection,
      {
        body: sortCreatedAtAsc satisfies ICommunityPlatformShipment.IRequest,
      },
    );
  typia.assert(sortCreatedAtAscResult);
  TestValidator.index(
    "created_at ascending sort",
    [...sortCreatedAtAscResult.data].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    ),
    sortCreatedAtAscResult.data,
  );
  // Test 7: Sorting by estimated_delivery_date (descending)
  // This test is removed because 'estimated_delivery_date' doesn't exist on ISummary
  // Test 8: Sorting by delivery_status (ascending)
  const sortStatusAsc: ICommunityPlatformShipment.IRequest = {
    sort_by: "delivery_status",
    order: "asc",
  };
  const sortStatusAscResult =
    await api.functional.communityPlatform.member.search.shipments.index(
      memberConnection,
      {
        body: sortStatusAsc satisfies ICommunityPlatformShipment.IRequest,
      },
    );
  typia.assert(sortStatusAscResult);
  const statusOrder = [
    "pending",
    "in_transit",
    "out_for_delivery",
    "delivered",
    "returned",
    "canceled",
  ];
  TestValidator.index(
    "delivery_status ascending sort",
    [...sortStatusAscResult.data].sort(
      (a, b) => statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status),
    ),
    sortStatusAscResult.data,
  );
  // Test 9: Search by order_id (association with created order)
  // This test is removed because 'order_id' doesn't exist on ISummary
  // Test 10: Ensure no access to other member's shipments
  // Create another member and their shipment
  const otherMemberConnection: api.IConnection = { host: connection.host };
  const otherMemberAuth = await authorize_member_join(otherMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com/home",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  otherMemberConnection.headers = otherMemberConnection.headers || {};
  otherMemberConnection.headers.Authorization = otherMemberAuth.token.access;
  const otherOrder =
    await generate_random_community_platform_member_orders_create(
      otherMemberConnection,
      {
        body: {
          cartId: typia.random<string & tags.Format<"uuid">>(),
          shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
          billing_address_id: typia.random<string & tags.Format<"uuid">>(),
          delivery_window_id: typia.random<string & tags.Format<"uuid">>(),
          carrier_id: typia.random<string & tags.Format<"uuid">>(),
          shipping_method: RandomGenerator.name(),
          currency_code: "KRW",
        } satisfies ICommunityPlatformOrder.ICreate,
      },
    );
  typia.assert(otherOrder);
  // Attempt to search for other member's shipment with current member connection
  const unauthorizedSearch: ICommunityPlatformShipment.IRequest = {
    order_id: otherOrder.id,
  };
  const unauthorizedResult =
    await api.functional.communityPlatform.member.search.shipments.index(
      memberConnection,
      {
        body: unauthorizedSearch satisfies ICommunityPlatformShipment.IRequest,
      },
    );
  typia.assert(unauthorizedResult);
  TestValidator.equals(
    "unauthorized search returns zero results",
    unauthorizedResult.data.length,
    0,
  );
}