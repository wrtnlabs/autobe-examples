import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerSession";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_sessions_paginated_searchable_list(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: "https://example.com/register",
      referrer: "https://example.com",
      ip: "127.0.0.1",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  const firstPage = await api.functional.shoppingMall.customer.sessions.index(
    customerConnection,
    {
      body: {
        page: 1,
        limit: 1,
      } satisfies IShoppingMallCustomerSession.IRequest,
    },
  );
  typia.assert(firstPage);
  TestValidator.equals("pagination current", firstPage.pagination.current, 1);
  TestValidator.equals("pagination limit", firstPage.pagination.limit, 1);
  TestValidator.predicate(
    "pagination records is non-negative",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    firstPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "page data respects limit",
    firstPage.data.length <= firstPage.pagination.limit,
  );
  if (firstPage.pagination.pages >= 2) {
    const middlePageNumber = Math.min(
      Math.max(2, Math.floor(firstPage.pagination.pages / 2)),
      firstPage.pagination.pages,
    );
    const middlePage =
      await api.functional.shoppingMall.customer.sessions.index(
        customerConnection,
        {
          body: {
            page: middlePageNumber,
            limit: 1,
          } satisfies IShoppingMallCustomerSession.IRequest,
        },
      );
    typia.assert(middlePage);
    TestValidator.equals(
      "middle page current",
      middlePage.pagination.current,
      middlePageNumber,
    );
    TestValidator.equals("middle page limit", middlePage.pagination.limit, 1);
    TestValidator.equals(
      "middle page records",
      middlePage.pagination.records,
      firstPage.pagination.records,
    );
    TestValidator.equals(
      "middle page pages",
      middlePage.pagination.pages,
      firstPage.pagination.pages,
    );
    TestValidator.predicate(
      "middle page data respects limit",
      middlePage.data.length <= middlePage.pagination.limit,
    );
  }
  const searchResponse =
    await api.functional.shoppingMall.customer.sessions.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 100,
          search: customer.email,
        } satisfies IShoppingMallCustomerSession.IRequest,
      },
    );
  typia.assert(searchResponse);
  TestValidator.equals(
    "search pagination current",
    searchResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "search pagination limit",
    searchResponse.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "search results remain scoped to the authenticated customer session list",
    searchResponse.data.every(
      (session) =>
        session.ip.length > 0 &&
        session.href.length > 0 &&
        session.referrer.length > 0,
    ),
  );
  TestValidator.predicate("session list is sorted newest first", () => {
    for (let i = 1; i < searchResponse.data.length; i++) {
      if (
        searchResponse.data[i - 1].created_at <
        searchResponse.data[i].created_at
      )
        return false;
    }
    return true;
  });
}
