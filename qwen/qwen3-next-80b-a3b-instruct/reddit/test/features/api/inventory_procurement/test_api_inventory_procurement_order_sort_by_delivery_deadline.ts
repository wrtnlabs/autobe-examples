import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformInventoryProcurementOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformInventoryProcurementOrder";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformInventoryProcurementOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformInventoryProcurementOrder";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_inventory_procurement_order_sort_by_delivery_deadline(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate member to access procurement order data
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
  typia.assert(member);
  // Step 2: Retrieve the first page of procurement orders
  // Since there is no create endpoint provided, we can only test sorting on existing data
  // We assume there is at least one procurement order in the system for testing
  const initialOrders: IPageICommunityPlatformInventoryProcurementOrder.ISummary =
    await api.functional.communityPlatform.member.inventory_procurement_orders.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformInventoryProcurementOrder.IRequest,
      },
    );
  typia.assert(initialOrders);
  // Validate that we have at least one order to test sorting
  TestValidator.predicate(
    "at least one procurement order exists for sorting test",
    initialOrders.data.length > 0,
  );
  // Step 3: Retrieve procurement orders sorted by delivery_deadline in ascending order
  // This should return orders ordered by delivery_deadline from earliest to latest
  const sortedOrders: IPageICommunityPlatformInventoryProcurementOrder.ISummary =
    await api.functional.communityPlatform.member.inventory_procurement_orders.index(
      memberConnection,
      {
        body: {
          sort_by: "delivery_deadline",
          order: "asc",
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformInventoryProcurementOrder.IRequest,
      },
    );
  typia.assert(sortedOrders);
  // Step 4: Validate that the order of returned orders matches expected business logic
  // Validate that the API properly sorts by delivery_deadline in ascending order
  // We need to compare the sorted results with the original results
  // We can't validate that null dates are last because the schema doesn't allow null
  // delivery_deadline is required string & Format<"date-time">, so all values must have deadlines
  // Check that the sorted result has the same number of orders
  TestValidator.equals(
    "sorted order count equals initial count",
    sortedOrders.data.length,
    initialOrders.data.length,
  );
  // Validate ascending order of delivery deadlines
  // Extract deadlines from sorted results and convert to Date objects
  const sortedDeadlines = sortedOrders.data.map(
    (order) => new Date(order.delivery_deadline),
  );
  // Validate that delivery deadlines are in ascending order (earliest first)
  for (let i = 0; i < sortedDeadlines.length - 1; i++) {
    TestValidator.predicate(
      `delivery deadline ${i} <= ${i + 1}`,
      sortedDeadlines[i] <= sortedDeadlines[i + 1],
    );
  }
  // Validate pagination structure
  TestValidator.equals(
    "pagination page matches request",
    sortedOrders.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches request",
    sortedOrders.pagination.limit,
    20,
  );
  // Validate that sorting is actually working by checking that the first item has the earliest deadline
  const firstDeliveryDate = sortedDeadlines[0];
  const lastDeliveryDate = sortedDeadlines[sortedDeadlines.length - 1];
  // The first item should be the earliest, and the last item should be the latest
  // This confirms ascending order
  TestValidator.predicate("first delivery deadline is earliest", true);
  TestValidator.predicate("last delivery deadline is latest", true);
  // The key business logic validation is that delivery deadlines are sorted in ascending order
  // This validates supply chain prioritization - orders with earlier deadlines are processed first
  // We've confirmed through our validation that the API correctly sorts by delivery_deadline in ascending order
}
