import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrder";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_order_history_filters_and_isolation(
  connection: api.IConnection,
): Promise<void> {
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: undefined,
  });
  const memberB = await authorize_member_join(memberBConnection, {
    body: undefined,
  });
  typia.assert(memberA);
  typia.assert(memberB);
  const now = new Date();
  const from30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const toNow = now;
  // Scenario 1: newest-first, pagination
  const listA1 = await api.functional.shoppingMall.member.orders.index(
    memberAConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IShoppingMallOrder.IRequest,
    },
  );
  typia.assert(listA1);
  TestValidator.equals("pagination current", listA1.pagination.current, 1);
  TestValidator.equals("pagination limit", listA1.pagination.limit, 10);
  for (let i = 0; i + 1 < listA1.data.length; i++) {
    const a = new Date(listA1.data[i]!.placedAt).getTime();
    const b = new Date(listA1.data[i + 1]!.placedAt).getTime();
    TestValidator.predicate(`placedAt newest-first at index ${i}`, a >= b);
  }
  // Scenario 2: overallStatus filter (using derived value from list)
  if (listA1.data.length > 0) {
    const overallStatus = listA1.data[0]!.overallStatus;
    const listAStatus = await api.functional.shoppingMall.member.orders.index(
      memberAConnection,
      {
        body: {
          page: 1,
          limit: 50,
          overallStatus,
        } satisfies IShoppingMallOrder.IRequest,
      },
    );
    typia.assert(listAStatus);
    for (const row of listAStatus.data) {
      TestValidator.equals(
        "overallStatus equals requested",
        row.overallStatus,
        overallStatus,
      );
    }
  }
  // Scenario 2: placedAt range filtering
  const listA2 = await api.functional.shoppingMall.member.orders.index(
    memberAConnection,
    {
      body: {
        page: 1,
        limit: 50,
        placedAtFrom: from30d.toISOString() satisfies string &
          tags.Format<"date-time">,
        placedAtTo: toNow.toISOString() satisfies string &
          tags.Format<"date-time">,
      } satisfies IShoppingMallOrder.IRequest,
    },
  );
  typia.assert(listA2);
  const minT = from30d.getTime();
  const maxT = toNow.getTime();
  for (const row of listA2.data) {
    const t = new Date(row.placedAt).getTime();
    TestValidator.predicate(
      "placedAt within inclusive range",
      t >= minT && t <= maxT,
    );
  }
  // Scenario 3: isolation and empty results
  const listAAll = await api.functional.shoppingMall.member.orders.index(
    memberAConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IShoppingMallOrder.IRequest,
    },
  );
  typia.assert(listAAll);
  const listBAll = await api.functional.shoppingMall.member.orders.index(
    memberBConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IShoppingMallOrder.IRequest,
    },
  );
  typia.assert(listBAll);
  if (listAAll.data.length > 0 && listBAll.data.length > 0) {
    const setA = new Set(listAAll.data.map((x) => x.id));
    for (const row of listBAll.data) {
      TestValidator.predicate(
        "member isolation: no overlap of order ids",
        !setA.has(row.id),
      );
    }
  }
  const farFutureFrom = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
  const farFutureTo = new Date(now.getTime() + 366 * 24 * 60 * 60 * 1000);
  const listAEmpty = await api.functional.shoppingMall.member.orders.index(
    memberAConnection,
    {
      body: {
        page: 1,
        limit: 10,
        placedAtFrom: farFutureFrom.toISOString() satisfies string &
          tags.Format<"date-time">,
        placedAtTo: farFutureTo.toISOString() satisfies string &
          tags.Format<"date-time">,
      } satisfies IShoppingMallOrder.IRequest,
    },
  );
  typia.assert(listAEmpty);
  TestValidator.equals(
    "empty pagination records",
    listAEmpty.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty pagination pages",
    listAEmpty.pagination.pages,
    0,
  );
  TestValidator.equals("empty data length", listAEmpty.data.length, 0);
}
