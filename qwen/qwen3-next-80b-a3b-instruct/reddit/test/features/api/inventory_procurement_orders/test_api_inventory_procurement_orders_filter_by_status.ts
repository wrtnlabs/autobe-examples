import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformInventoryProcurementOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformInventoryProcurementOrder";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformInventoryProcurementOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformInventoryProcurementOrder";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_inventory_procurement_orders_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com",
      ip: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Step 2: Retrieve all inventory procurement orders without status filter
  const allOrdersResponse =
    await api.functional.communityPlatform.admin.inventory_procurement_orders.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies ICommunityPlatformInventoryProcurementOrder.IRequest,
      },
    );
  typia.assert(allOrdersResponse);
  // Step 3: Extract unique status values from all orders
  const statusSet = new Set<string>();
  for (const order of allOrdersResponse.data) {
    // Validate that status is one of the allowed values
    TestValidator.predicate(
      `order status is valid`,
      ["pending", "approved", "fulfilled", "cancelled"].includes(order.status),
    );
    statusSet.add(order.status);
  }
  // Step 4: Test filtering by each unique status found
  for (const status of statusSet) {
    const filteredResponse =
      await api.functional.communityPlatform.admin.inventory_procurement_orders.index(
        adminConnection,
        {
          body: {
            status: status as
              | "pending"
              | "approved"
              | "fulfilled"
              | "cancelled",
            page: 1,
            limit: 100,
          } satisfies ICommunityPlatformInventoryProcurementOrder.IRequest,
        },
      );
    typia.assert(filteredResponse);
    // Verify each returned order has the correct status
    TestValidator.predicate(
      `all returned orders have status '${status}'`,
      filteredResponse.data.every((order) => order.status === status),
    );
    // Verify the count matches the count of this status in all orders
    const countOfStatus = allOrdersResponse.data.filter(
      (order) => order.status === status,
    ).length;
    TestValidator.equals(
      `total count matches count of ${status} orders`,
      filteredResponse.pagination.records,
      countOfStatus,
    );
  }
  // Step 5: Test that no status filter returns all orders
  const noFilterResponse =
    await api.functional.communityPlatform.admin.inventory_procurement_orders.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies ICommunityPlatformInventoryProcurementOrder.IRequest,
      },
    );
  typia.assert(noFilterResponse);
  // Verify the total count matches the original response
  TestValidator.equals(
    "no filter returns all orders",
    noFilterResponse.pagination.records,
    allOrdersResponse.pagination.records,
  );
  // Step 6: Verify pagination structure is consistent
  TestValidator.equals(
    "pagination current page is 1",
    allOrdersResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches request",
    allOrdersResponse.pagination.limit,
    100,
  );
  // Step 7: Test with a status that might not exist (empty result)
  const nonExistentStatus = "nonexistent-status" as const;
  const emptyResponse =
    await api.functional.communityPlatform.admin.inventory_procurement_orders.index(
      adminConnection,
      {
        body: {
          status: typia.assert<"pending" | "approved" | "fulfilled" | "cancelled" | undefined>(nonExistentStatus),
          page: 1,
          limit: 100,
        } satisfies ICommunityPlatformInventoryProcurementOrder.IRequest,
      },
    );
  typia.assert(emptyResponse);
  // Verify no data is returned for non-existent status
  TestValidator.equals(
    "no data for non-existent status",
    emptyResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty data array for non-existent status",
    emptyResponse.data.length,
    0,
  );
  // Verify pagination is still valid
  TestValidator.equals(
    "pagination current page is 1",
    emptyResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches request",
    emptyResponse.pagination.limit,
    100,
  );
}