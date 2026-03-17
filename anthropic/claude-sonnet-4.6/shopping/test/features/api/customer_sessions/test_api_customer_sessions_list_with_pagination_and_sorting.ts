import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSuperAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSuperAdminSession";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSuperAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdminSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_sessions_list_with_pagination_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new customer to create a session record
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // Step 2: Test pagination with sort=created_at, order=desc
  const pageDescResult =
    await api.functional.shoppingMall.customer.sessions.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 10,
          sort: "created_at",
          order: "desc",
        } satisfies IShoppingMallSuperAdminSession.IRequest,
      },
    );
  typia.assert(pageDescResult);
  // Validate pagination metadata
  TestValidator.equals(
    "page=1 current page",
    pageDescResult.pagination.current,
    1,
  );
  TestValidator.equals("limit=10 matches", pageDescResult.pagination.limit, 10);
  TestValidator.predicate(
    "data length <= 10",
    pageDescResult.data.length <= 10,
  );
  // Step 3: Verify descending order by createdAt (newest first)
  if (pageDescResult.data.length >= 2) {
    for (let i = 0; i < pageDescResult.data.length - 1; i++) {
      const current = pageDescResult.data[i]!;
      const next = pageDescResult.data[i + 1]!;
      TestValidator.predicate(
        "desc order: each session createdAt >= next",
        new Date(current.createdAt).getTime() >=
          new Date(next.createdAt).getTime(),
      );
    }
  }
  // Step 4: Test ascending order by created_at
  const pageAscResult =
    await api.functional.shoppingMall.customer.sessions.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 10,
          sort: "created_at",
          order: "asc",
        } satisfies IShoppingMallSuperAdminSession.IRequest,
      },
    );
  typia.assert(pageAscResult);
  // Verify ascending order by createdAt (oldest first)
  if (pageAscResult.data.length >= 2) {
    for (let i = 0; i < pageAscResult.data.length - 1; i++) {
      const current = pageAscResult.data[i]!;
      const next = pageAscResult.data[i + 1]!;
      TestValidator.predicate(
        "asc order: each session createdAt <= next",
        new Date(current.createdAt).getTime() <=
          new Date(next.createdAt).getTime(),
      );
    }
  }
  // Step 5: Test sort by expired_at descending
  const expiredAtDescResult =
    await api.functional.shoppingMall.customer.sessions.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 10,
          sort: "expired_at",
          order: "desc",
        } satisfies IShoppingMallSuperAdminSession.IRequest,
      },
    );
  typia.assert(expiredAtDescResult);
  // Verify descending order by expiredAt
  if (expiredAtDescResult.data.length >= 2) {
    for (let i = 0; i < expiredAtDescResult.data.length - 1; i++) {
      const current = expiredAtDescResult.data[i]!;
      const next = expiredAtDescResult.data[i + 1]!;
      TestValidator.predicate(
        "expired_at desc order: each session expiredAt >= next",
        new Date(current.expiredAt).getTime() >=
          new Date(next.expiredAt).getTime(),
      );
    }
  }
  // Step 6: Test limit=1 pagination
  const limitOneResult =
    await api.functional.shoppingMall.customer.sessions.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 1,
        } satisfies IShoppingMallSuperAdminSession.IRequest,
      },
    );
  typia.assert(limitOneResult);
  TestValidator.equals(
    "limit=1 pagination.limit",
    limitOneResult.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "limit=1 data.length <= 1",
    limitOneResult.data.length <= 1,
  );
  // Verify pages calculation: Math.ceil(records / limit)
  const expectedPages =
    limitOneResult.pagination.records === 0
      ? 0
      : Math.ceil(limitOneResult.pagination.records / 1);
  TestValidator.equals(
    "pages = ceil(records / limit)",
    limitOneResult.pagination.pages,
    expectedPages,
  );
  // Step 7: If multiple pages exist, test page 2
  if (limitOneResult.pagination.pages > 1) {
    const pageTwoResult =
      await api.functional.shoppingMall.customer.sessions.index(
        customerConnection,
        {
          body: {
            page: 2,
            limit: 1,
          } satisfies IShoppingMallSuperAdminSession.IRequest,
        },
      );
    typia.assert(pageTwoResult);
    TestValidator.equals("page 2 current", pageTwoResult.pagination.current, 2);
    TestValidator.equals("page 2 limit=1", pageTwoResult.pagination.limit, 1);
    TestValidator.predicate(
      "page 2 data.length <= 1",
      pageTwoResult.data.length <= 1,
    );
  }
}
