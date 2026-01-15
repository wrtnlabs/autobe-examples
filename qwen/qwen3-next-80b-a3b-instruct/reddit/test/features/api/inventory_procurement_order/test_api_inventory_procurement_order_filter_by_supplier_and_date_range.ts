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
export async function test_api_inventory_procurement_order_filter_by_supplier_and_date_range(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as member to get authorized connection
  const memberConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: `https://example.com/join?source=${RandomGenerator.alphaNumeric(6)}`,
      referrer: `https://example.com/home?ref=${RandomGenerator.alphaNumeric(6)}`,
    },
  });
  typia.assert(authResult);
  // Step 2: Get existing procurement orders from the system
  const allOrders =
    await api.functional.communityPlatform.member.inventory_procurement_orders.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 50,
        } satisfies ICommunityPlatformInventoryProcurementOrder.IRequest,
      },
    );
  typia.assert(allOrders);
  // Verify we have at least some orders to work with
  TestValidator.predicate(
    "system has at least 3 procurement orders",
    allOrders.data.length >= 3,
  );
  // Step 3: Select a supplier code that has multiple orders
  const supplierCodeMap = new Map<
    string,
    ICommunityPlatformInventoryProcurementOrder.ISummary[]
  >();
  allOrders.data.forEach((order) => {
    if (!supplierCodeMap.has(order.supplier_code)) {
      supplierCodeMap.set(order.supplier_code, []);
    }
    supplierCodeMap.get(order.supplier_code)!.push(order);
  });
  // Find a supplier code with at least 3 orders
  const targetSupplierCode = Array.from(supplierCodeMap.entries()).find(
    ([code, orders]) => orders.length >= 3,
  )?.[0];
  // If no supplier has 3+ orders, use the first one
  const supplierCode = targetSupplierCode || allOrders.data[0].supplier_code;
  // Get all orders for this supplier
  const supplierOrders = supplierCodeMap.get(supplierCode)!;
  // Sort orders by delivery_deadline to find earliest and latest
  const sortedOrders = [...supplierOrders].sort(
    (a, b) =>
      new Date(a.delivery_deadline).getTime() -
      new Date(b.delivery_deadline).getTime(),
  );
  const earliestDate = sortedOrders[0].delivery_deadline; // Oldest delivery deadline
  const latestDate = sortedOrders[sortedOrders.length - 1].delivery_deadline; // Newest delivery deadline
  // Step 4: Filter by target supplier code and delivery deadline range that should match multiple orders
  const startDate = earliestDate;
  const endDate = latestDate;
  const filteredResult =
    await api.functional.communityPlatform.member.inventory_procurement_orders.index(
      memberConnection,
      {
        body: {
          supplier_code: supplierCode,
          created_after: startDate, // Using delivery_deadline as proxy for creation date
          created_before: endDate, // Using delivery_deadline as proxy for creation date
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformInventoryProcurementOrder.IRequest,
      },
    );
  typia.assert(filteredResult);
  // Step 5: Validate that filtering returns at least the expected number of orders
  TestValidator.predicate(
    "filtered results contain at least 3 orders",
    filteredResult.data.length >= 3,
  );
  // Verify all returned orders match our criteria
  filteredResult.data.forEach((order) => {
    TestValidator.equals(
      "order has correct supplier code",
      order.supplier_code,
      supplierCode,
    );
    TestValidator.predicate(
      "order has delivery deadline after start date",
      order.delivery_deadline >= startDate,
    );
    TestValidator.predicate(
      "order has delivery deadline before end date",
      order.delivery_deadline <= endDate,
    );
  });
  // Step 6: Test edge case: date range with no results (future dates)
  const noResultStartDate = new Date(
    new Date(latestDate).getTime() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString(); // One week after last delivery deadline
  const noResultEndDate = new Date(
    new Date(latestDate).getTime() + 14 * 24 * 60 * 60 * 1000,
  ).toISOString(); // Two weeks after last delivery deadline
  const noResults =
    await api.functional.communityPlatform.member.inventory_procurement_orders.index(
      memberConnection,
      {
        body: {
          supplier_code: supplierCode,
          created_after: noResultStartDate,
          created_before: noResultEndDate,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformInventoryProcurementOrder.IRequest,
      },
    );
  typia.assert(noResults);
  // Validate empty result set
  TestValidator.equals(
    "no results when date range has no matching orders",
    noResults.data.length,
    0,
  );
  // Final validation: ensure we didn't modify the system state
  const postTestOrders =
    await api.functional.communityPlatform.member.inventory_procurement_orders.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 50,
        } satisfies ICommunityPlatformInventoryProcurementOrder.IRequest,
      },
    );
  typia.assert(postTestOrders);
  TestValidator.equals(
    "system state unchanged",
    postTestOrders.data.length,
    allOrders.data.length,
  );
}
