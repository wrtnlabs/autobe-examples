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
export async function test_api_inventory_procurement_order_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authorize a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com/home",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // Step 2: Test retrieval with each status filter
  const testStatusFilter = async (
    status: "pending" | "approved" | "fulfilled" | "cancelled",
  ) => {
    const result =
      await api.functional.communityPlatform.member.inventory_procurement_orders.index(
        memberConnection,
        {
          body: {
            status: status,
            page: 1,
            limit: 10,
          } satisfies ICommunityPlatformInventoryProcurementOrder.IRequest,
        },
      );
    typia.assert(result);
    // Validate pagination structure
    TestValidator.equals(
      "pagination has correct current",
      result.pagination.current,
      1,
    );
    TestValidator.equals(
      "pagination has correct limit",
      result.pagination.limit,
      10,
    );
    TestValidator.predicate(
      "pagination records >= 0",
      result.pagination.records >= 0,
    );
    TestValidator.predicate(
      "pagination pages >= 0",
      result.pagination.pages >= 0,
    );
    // Validate data structure
    TestValidator.predicate("data array exists", Array.isArray(result.data));
    if (result.data.length > 0) {
      // If there are orders, validate that they have correct status
      for (const order of result.data) {
        TestValidator.equals(
          "order status matches filter",
          order.status,
          status,
        );
      }
    }
    // Validate data type of each order
    for (const order of result.data) {
      typia.assert<ICommunityPlatformInventoryProcurementOrder.ISummary>(order);
    }
  };
  await testStatusFilter("pending");
  await testStatusFilter("approved");
  await testStatusFilter("fulfilled");
  await testStatusFilter("cancelled");
  // Step 3: Test without status filter (all orders)
  const allOrders =
    await api.functional.communityPlatform.member.inventory_procurement_orders.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformInventoryProcurementOrder.IRequest,
      },
    );
  typia.assert(allOrders);
  TestValidator.equals(
    "all orders pagination has correct current",
    allOrders.pagination.current,
    1,
  );
  TestValidator.equals(
    "all orders pagination has correct limit",
    allOrders.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "all orders records >= 0",
    allOrders.pagination.records >= 0,
  );
  for (const order of allOrders.data) {
    typia.assert<ICommunityPlatformInventoryProcurementOrder.ISummary>(order);
  }
}
