import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerSession";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_session_filter_by_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      nickname: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Query all sessions without filters (baseline)
  const allSessions = await api.functional.shoppingMall.customer.sessions.index(
    customerConnection,
    {
      body: {
        page: 1,
        limit: 100,
        sort: "created_at,desc",
      } satisfies IShoppingMallSellerSession.IRequest,
    },
  );
  typia.assert(allSessions);
  TestValidator.predicate("has sessions", allSessions.data.length > 0);
  // 3. Test dateFrom filter - sessions created on or after specified date
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const sessionsFromDate =
    await api.functional.shoppingMall.customer.sessions.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 100,
          dateFrom: oneDayAgo.toISOString(),
          sort: "created_at,desc",
        } satisfies IShoppingMallSellerSession.IRequest,
      },
    );
  typia.assert(sessionsFromDate);
  // Validate all returned sessions are on or after dateFrom
  for (const session of sessionsFromDate.data) {
    TestValidator.predicate(
      "session created after dateFrom",
      new Date(session.created_at) >= oneDayAgo,
    );
  }
  // 4. Test dateTo filter - sessions created on or before specified date
  const sessionsToDate =
    await api.functional.shoppingMall.customer.sessions.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 100,
          dateTo: now.toISOString(),
          sort: "created_at,desc",
        } satisfies IShoppingMallSellerSession.IRequest,
      },
    );
  typia.assert(sessionsToDate);
  // Validate all returned sessions are on or before dateTo
  for (const session of sessionsToDate.data) {
    TestValidator.predicate(
      "session created before dateTo",
      new Date(session.created_at) <= now,
    );
  }
  // 5. Test combined dateFrom and dateTo filters
  const sessionsDateRange =
    await api.functional.shoppingMall.customer.sessions.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 100,
          dateFrom: oneDayAgo.toISOString(),
          dateTo: now.toISOString(),
          sort: "created_at,desc",
        } satisfies IShoppingMallSellerSession.IRequest,
      },
    );
  typia.assert(sessionsDateRange);
  // Validate all sessions are within the date range
  for (const session of sessionsDateRange.data) {
    const sessionDate = new Date(session.created_at);
    TestValidator.predicate(
      "session within date range",
      sessionDate >= oneDayAgo && sessionDate <= now,
    );
  }
  // 6. Validate pagination metadata reflects filtered results
  TestValidator.predicate(
    "pagination current page is 1",
    sessionsDateRange.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is 100",
    sessionsDateRange.pagination.limit === 100,
  );
  TestValidator.predicate(
    "pagination records matches data length",
    sessionsDateRange.pagination.records === sessionsDateRange.data.length,
  );
  // 7. Test sorting by created_at in descending order (newest first)
  const sessionsDesc =
    await api.functional.shoppingMall.customer.sessions.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 100,
          dateFrom: oneDayAgo.toISOString(),
          dateTo: now.toISOString(),
          sort: "created_at,desc",
        } satisfies IShoppingMallSellerSession.IRequest,
      },
    );
  typia.assert(sessionsDesc);
  if (sessionsDesc.data.length > 1) {
    for (let i = 1; i < sessionsDesc.data.length; i++) {
      TestValidator.predicate(
        "sessions sorted desc by created_at",
        new Date(sessionsDesc.data[i - 1].created_at) >=
          new Date(sessionsDesc.data[i].created_at),
      );
    }
  }
  // 8. Test sorting by created_at in ascending order (oldest first)
  const sessionsAsc = await api.functional.shoppingMall.customer.sessions.index(
    customerConnection,
    {
      body: {
        page: 1,
        limit: 100,
        dateFrom: oneDayAgo.toISOString(),
        dateTo: now.toISOString(),
        sort: "created_at,asc",
      } satisfies IShoppingMallSellerSession.IRequest,
    },
  );
  typia.assert(sessionsAsc);
  if (sessionsAsc.data.length > 1) {
    for (let i = 1; i < sessionsAsc.data.length; i++) {
      TestValidator.predicate(
        "sessions sorted asc by created_at",
        new Date(sessionsAsc.data[i - 1].created_at) <=
          new Date(sessionsAsc.data[i].created_at),
      );
    }
  }
  // 9. Test with null dateFrom (no lower bound)
  const sessionsNoDateFrom =
    await api.functional.shoppingMall.customer.sessions.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 100,
          dateFrom: null,
          dateTo: now.toISOString(),
          sort: "created_at,desc",
        } satisfies IShoppingMallSellerSession.IRequest,
      },
    );
  typia.assert(sessionsNoDateFrom);
  // 10. Test with null dateTo (no upper bound)
  const sessionsNoDateTo =
    await api.functional.shoppingMall.customer.sessions.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 100,
          dateFrom: oneDayAgo.toISOString(),
          dateTo: null,
          sort: "created_at,desc",
        } satisfies IShoppingMallSellerSession.IRequest,
      },
    );
  typia.assert(sessionsNoDateTo);
}
