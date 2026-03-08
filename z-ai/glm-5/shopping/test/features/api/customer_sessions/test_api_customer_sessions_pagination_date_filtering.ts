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

/**
 * Test customer session history pagination and date range filtering.
 *
 * Validates that:
 * - Pagination parameters work correctly (limit, page)
 * - Date range filters work correctly (from, to parameters)
 * - Cursor-based pagination works with created_at and id composite cursor
 * - Ordering is maintained (created_at DESC, then id DESC)
 */
export async function test_api_customer_sessions_pagination_date_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a customer account and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  // 2. Test pagination with limit parameter
  const limitResult = await api.functional.shoppingMall.customer.sessions.index(
    customerConnection,
    {
      body: {
        limit: 5,
      } satisfies IShoppingMallSellerSession.IRequest,
    },
  );
  typia.assert(limitResult);
  TestValidator.equals(
    "limit matches request",
    limitResult.pagination.limit,
    5,
  );
  TestValidator.equals(
    "current defaults to 1",
    limitResult.pagination.current,
    1,
  );
  // 3. Test date filtering with 'from' parameter
  const now = new Date();
  const fromTime = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const fromResult = await api.functional.shoppingMall.customer.sessions.index(
    customerConnection,
    {
      body: {
        from: fromTime,
      } satisfies IShoppingMallSellerSession.IRequest,
    },
  );
  typia.assert(fromResult);
  // Verify all returned sessions have created_at >= from value
  for (const session of fromResult.data) {
    TestValidator.predicate(
      "session created_at >= from",
      session.created_at >= fromTime,
    );
  }
  // 4. Test date filtering with 'to' parameter
  const toTime = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
  const toResult = await api.functional.shoppingMall.customer.sessions.index(
    customerConnection,
    {
      body: {
        to: toTime,
      } satisfies IShoppingMallSellerSession.IRequest,
    },
  );
  typia.assert(toResult);
  // Verify all returned sessions have created_at <= to value
  for (const session of toResult.data) {
    TestValidator.predicate(
      "session created_at <= to",
      session.created_at <= toTime,
    );
  }
  // 5. Test combined date range filtering (both from and to)
  const rangeFrom = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();
  const rangeTo = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString();
  const rangeResult = await api.functional.shoppingMall.customer.sessions.index(
    customerConnection,
    {
      body: {
        from: rangeFrom,
        to: rangeTo,
      } satisfies IShoppingMallSellerSession.IRequest,
    },
  );
  typia.assert(rangeResult);
  // Verify all returned sessions are within the date range
  for (const session of rangeResult.data) {
    TestValidator.predicate(
      "session in date range",
      session.created_at >= rangeFrom && session.created_at <= rangeTo,
    );
  }
  // 6. Test cursor-based pagination
  const firstPage = await api.functional.shoppingMall.customer.sessions.index(
    customerConnection,
    {
      body: {
        limit: 1,
      } satisfies IShoppingMallSellerSession.IRequest,
    },
  );
  typia.assert(firstPage);
  if (firstPage.data.length > 0) {
    const cursorSession = firstPage.data[0];
    const nextPage = await api.functional.shoppingMall.customer.sessions.index(
      customerConnection,
      {
        body: {
          limit: 1,
          created_at: cursorSession.created_at,
          id: cursorSession.id,
        } satisfies IShoppingMallSellerSession.IRequest,
      },
    );
    typia.assert(nextPage);
    // Verify subsequent page returns different sessions
    if (nextPage.data.length > 0) {
      TestValidator.notEquals(
        "cursor pagination returns different session",
        nextPage.data[0].id,
        cursorSession.id,
      );
    }
    // Verify ordering is maintained (created_at DESC)
    const orderedResult =
      await api.functional.shoppingMall.customer.sessions.index(
        customerConnection,
        {
          body: {
            limit: 10,
          } satisfies IShoppingMallSellerSession.IRequest,
        },
      );
    typia.assert(orderedResult);
    for (let i = 1; i < orderedResult.data.length; i++) {
      const prev = orderedResult.data[i - 1];
      const curr = orderedResult.data[i];
      TestValidator.predicate(
        "ordering maintained (created_at DESC)",
        prev.created_at >= curr.created_at,
      );
    }
  }
  // 7. Test limit boundary values
  const minLimitResult =
    await api.functional.shoppingMall.customer.sessions.index(
      customerConnection,
      {
        body: {
          limit: 1,
        } satisfies IShoppingMallSellerSession.IRequest,
      },
    );
  typia.assert(minLimitResult);
  TestValidator.predicate(
    "limit 1 returns at most 1 session",
    minLimitResult.data.length <= 1,
  );
  const maxLimitResult =
    await api.functional.shoppingMall.customer.sessions.index(
      customerConnection,
      {
        body: {
          limit: 100,
        } satisfies IShoppingMallSellerSession.IRequest,
      },
    );
  typia.assert(maxLimitResult);
  TestValidator.predicate(
    "limit 100 returns at most 100 sessions",
    maxLimitResult.data.length <= 100,
  );
  // 8. Test page beyond available data
  const beyondPageResult =
    await api.functional.shoppingMall.customer.sessions.index(
      customerConnection,
      {
        body: {
          limit: 10,
          page: 9999,
        } satisfies IShoppingMallSellerSession.IRequest,
      },
    );
  typia.assert(beyondPageResult);
  TestValidator.equals(
    "page beyond data returns empty array",
    beyondPageResult.data.length,
    0,
  );
  TestValidator.predicate(
    "pagination metadata is valid",
    beyondPageResult.pagination.pages >= 0,
  );
}
