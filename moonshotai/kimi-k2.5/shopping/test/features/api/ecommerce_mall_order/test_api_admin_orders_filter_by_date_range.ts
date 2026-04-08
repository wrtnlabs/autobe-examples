import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrder";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_orders_filter_by_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneWeekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const twoWeeksLater = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  // 2. Test date range filtering with past week
  const pastWeekResponse =
    await api.functional.ecommerceMall.admin.orders.index(adminConnection, {
      body: {
        createdAfter: oneWeekAgo.toISOString(),
        createdBefore: now.toISOString(),
      } satisfies IEcommerceMallOrder.IRequest,
    });
  typia.assert(pastWeekResponse);
  TestValidator.predicate(
    "past week response has valid pagination",
    pastWeekResponse.pagination.current >= 0 &&
      pastWeekResponse.pagination.limit > 0 &&
      pastWeekResponse.pagination.records >= 0,
  );
  // 3. Test boundary condition - same start and end date
  const boundaryResponse =
    await api.functional.ecommerceMall.admin.orders.index(adminConnection, {
      body: {
        createdAfter: oneDayAgo.toISOString(),
        createdBefore: oneDayAgo.toISOString(),
      } satisfies IEcommerceMallOrder.IRequest,
    });
  typia.assert(boundaryResponse);
  // 4. Test with future dates (should return empty results)
  const futureResponse = await api.functional.ecommerceMall.admin.orders.index(
    adminConnection,
    {
      body: {
        createdAfter: oneWeekLater.toISOString(),
        createdBefore: twoWeeksLater.toISOString(),
      } satisfies IEcommerceMallOrder.IRequest,
    },
  );
  typia.assert(futureResponse);
  TestValidator.equals(
    "future dates should return empty data",
    futureResponse.data.length,
    0,
  );
  TestValidator.equals(
    "future dates should have zero records",
    futureResponse.pagination.records,
    0,
  );
  // 5. Verify sorting by checking if orders are in descending chronological order (newest first)
  if (pastWeekResponse.data.length > 1) {
    const firstOrderDate = new Date(pastWeekResponse.data[0].createdAt);
    const secondOrderDate = new Date(pastWeekResponse.data[1].createdAt);
    TestValidator.predicate(
      "orders sorted by createdAt descending (newest first)",
      firstOrderDate.getTime() >= secondOrderDate.getTime(),
    );
  }
  // 6. Test with only createdAfter filter
  const afterOnlyResponse =
    await api.functional.ecommerceMall.admin.orders.index(adminConnection, {
      body: {
        createdAfter: oneWeekAgo.toISOString(),
      } satisfies IEcommerceMallOrder.IRequest,
    });
  typia.assert(afterOnlyResponse);
  // 7. Test with only createdBefore filter
  const beforeOnlyResponse =
    await api.functional.ecommerceMall.admin.orders.index(adminConnection, {
      body: {
        createdBefore: now.toISOString(),
      } satisfies IEcommerceMallOrder.IRequest,
    });
  typia.assert(beforeOnlyResponse);
  // 8. Verify all orders in filtered results fall within the specified date range
  if (pastWeekResponse.data.length > 0) {
    const createdAfterMs = oneWeekAgo.getTime();
    const createdBeforeMs = now.getTime();
    const ordersInRange = pastWeekResponse.data.every((order) => {
      const orderDateMs = new Date(order.createdAt).getTime();
      return orderDateMs >= createdAfterMs && orderDateMs <= createdBeforeMs;
    });
    TestValidator.predicate(
      "all orders in response fall within specified date range",
      ordersInRange,
    );
  }
}
