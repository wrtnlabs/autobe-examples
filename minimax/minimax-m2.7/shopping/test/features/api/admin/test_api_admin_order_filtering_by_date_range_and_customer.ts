import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
import type { IPageIEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrder";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_order_filtering_by_date_range_and_customer(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      actorType: "customer",
      requestedGrade: "admin",
      reason: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. Get admin token from join response for subsequent requests
  // The adminConnection.headers.Authorization is now set by authorize_admin_join
  // 3. Test date range filtering - retrieve all orders in date range
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const dateRangeResult = await api.functional.ecommerceMall.admin.orders.index(
    adminConnection,
    {
      body: {
        createdAtFrom: thirtyDaysAgo.toISOString(),
        createdAtTo: now.toISOString(),
      } satisfies IEcommerceMallOrder.IRequest,
    },
  );
  typia.assert(dateRangeResult);
  // Validate all returned orders are within date range
  for (const order of dateRangeResult.data) {
    const orderDate = new Date(order.created_at);
    TestValidator.predicate(
      "order within date range",
      orderDate >= thirtyDaysAgo && orderDate <= now,
    );
    TestValidator.equals("order not deleted", order.deleted_at, null);
  }
  // 4. Test date range with only lower bound
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const recentOrdersResult =
    await api.functional.ecommerceMall.admin.orders.index(adminConnection, {
      body: {
        createdAtFrom: weekAgo.toISOString(),
      } satisfies IEcommerceMallOrder.IRequest,
    });
  typia.assert(recentOrdersResult);
  // Validate all recent orders
  for (const order of recentOrdersResult.data) {
    const orderDate = new Date(order.created_at);
    TestValidator.predicate(
      "recent order within date range",
      orderDate >= weekAgo,
    );
    TestValidator.equals("order not deleted", order.deleted_at, null);
  }
  // 5. Test date range with only upper bound
  const olderOrdersResult =
    await api.functional.ecommerceMall.admin.orders.index(adminConnection, {
      body: {
        createdAtTo: thirtyDaysAgo.toISOString(),
      } satisfies IEcommerceMallOrder.IRequest,
    });
  typia.assert(olderOrdersResult);
  for (const order of olderOrdersResult.data) {
    const orderDate = new Date(order.created_at);
    TestValidator.predicate(
      "older order within date range",
      orderDate <= thirtyDaysAgo,
    );
    TestValidator.equals("order not deleted", order.deleted_at, null);
  }
  // 6. Test partial order number matching
  if (dateRangeResult.data.length > 0) {
    const firstOrderNumber = dateRangeResult.data[0].order_number;
    const partialNumber = firstOrderNumber.substring(
      0,
      Math.floor(firstOrderNumber.length / 2),
    );
    const orderNumberResult =
      await api.functional.ecommerceMall.admin.orders.index(adminConnection, {
        body: {
          orderNumber: partialNumber,
        } satisfies IEcommerceMallOrder.IRequest,
      });
    typia.assert(orderNumberResult);
    // All results should contain the partial order number
    for (const order of orderNumberResult.data) {
      TestValidator.predicate(
        "order number contains partial match",
        order.order_number.includes(partialNumber),
      );
    }
  }
  // 7. Test pagination parameters
  const paginatedResult = await api.functional.ecommerceMall.admin.orders.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IEcommerceMallOrder.IRequest,
    },
  );
  typia.assert(paginatedResult);
  // Cast pagination to access properties dynamically
  const pagination = paginatedResult.pagination as Record<string, unknown>;
  TestValidator.predicate(
    "pagination page is valid",
    typeof pagination.page === "number" && pagination.page >= 0,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    typeof pagination.limit === "number" && pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination total is valid",
    typeof pagination.total === "number" && pagination.total >= 0,
  );
  TestValidator.predicate(
    "pagination pages is valid",
    typeof pagination.pages === "number" && pagination.pages >= 0,
  );
  TestValidator.predicate("data is array", Array.isArray(paginatedResult.data));
}
