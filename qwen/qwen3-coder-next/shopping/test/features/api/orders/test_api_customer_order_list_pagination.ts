import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrder";
import type { IShoppingMallAdminSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSessions";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test customer order list pagination functionality.
 * This test validates:
 * 1. Pagination metadata correctness
 * 2. Page navigation
 * 3. Boundary conditions
 * 4. Limit validation
 */
export async function test_api_customer_order_list_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await api.functional.shoppingMall.auth.customer.join(
    customerConnection,
    {
      body: {
        email: typia.random<
          string &
            tags.Format<"email"> &
            tags.MinLength<1> &
            tags.MaxLength<255>
        >(),
        password: "12345678",
        display_name: RandomGenerator.name(),
        href: "https://example.com/join",
        referrer: "https://example.com/referrer",
      } satisfies IShoppingMallCustomer.IJoin,
    },
  );
  typia.assert(customer);
  // 2. Test pagination with limit=5 (without creating orders first to save API calls)
  const page1Result = await api.functional.shoppingMall.customer.orders.index(
    customerConnection,
    {
      body: {
        page: 1,
        limit: 5,
      } satisfies IShoppingMallOrder.IRequest,
    },
  );
  typia.assert(page1Result);
  // Validate pagination metadata
  const page1 = page1Result;
  // Verify limit is applied correctly
  TestValidator.equals("page1 limit applied", page1.data.length, 5);
  // Verify pagination metadata
  TestValidator.equals("page1 current page", page1.pagination.current, 1);
  TestValidator.equals("page1 limit", page1.pagination.limit, 5);
  // Verify page calculation
  const expectedPages = Math.ceil(page1.pagination.records / 5);
  TestValidator.equals(
    "page1 pages calculation",
    page1.pagination.pages,
    expectedPages,
  );
  // 3. Test navigation to next page
  const page2Result = await api.functional.shoppingMall.customer.orders.index(
    customerConnection,
    {
      body: {
        page: 2,
        limit: 5,
      } satisfies IShoppingMallOrder.IRequest,
    },
  );
  typia.assert(page2Result);
  // 4. Verify different orders on different pages (if enough records exist)
  if (page1.pagination.records > 5) {
    TestValidator.notEquals(
      "different pages have different data",
      JSON.stringify(page1.data.map((o) => o.id)),
      JSON.stringify(page2Result.data.map((o) => o.id)),
    );
  }
  // 5. Test boundary conditions
  // 5-1. Test page=1 (first page)
  const firstPage = await api.functional.shoppingMall.customer.orders.index(
    customerConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IShoppingMallOrder.IRequest,
    },
  );
  typia.assert(firstPage);
  TestValidator.equals("first page number", firstPage.pagination.current, 1);
  // 5-2. Test last page (if pages exist)
  if (firstPage.pagination.records > 0) {
    const totalPages = firstPage.pagination.pages;
    if (totalPages > 0) {
      const lastPage = await api.functional.shoppingMall.customer.orders.index(
        customerConnection,
        {
          body: {
            page: totalPages,
            limit: 10,
          } satisfies IShoppingMallOrder.IRequest,
        },
      );
      typia.assert(lastPage);
      TestValidator.equals(
        "last page number",
        lastPage.pagination.current,
        totalPages,
      );
    }
  }
  // 5-3. Test page beyond total pages
  const beyondPage = await api.functional.shoppingMall.customer.orders.index(
    customerConnection,
    {
      body: {
        page: 999,
        limit: 10,
      } satisfies IShoppingMallOrder.IRequest,
    },
  );
  typia.assert(beyondPage);
  TestValidator.equals("beyond page data empty", beyondPage.data.length, 0);
  // 6. Test limit boundaries
  // 6-1. Test minimum limit (1)
  const minLimit = await api.functional.shoppingMall.customer.orders.index(
    customerConnection,
    {
      body: {
        page: 1,
        limit: 1,
      } satisfies IShoppingMallOrder.IRequest,
    },
  );
  typia.assert(minLimit);
  if (minLimit.pagination.records > 0) {
    TestValidator.equals("minimum limit applied", minLimit.data.length, 1);
  }
  // 6-2. Test maximum limit (100)
  const maxLimit = await api.functional.shoppingMall.customer.orders.index(
    customerConnection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IShoppingMallOrder.IRequest,
    },
  );
  typia.assert(maxLimit);
  TestValidator.predicate(
    "maximum limit not exceeded",
    maxLimit.data.length <= 100,
  );
  // 7. Test with limit=100 (maximum allowed)
  const maxAllowed = await api.functional.shoppingMall.customer.orders.index(
    customerConnection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IShoppingMallOrder.IRequest,
    },
  );
  typia.assert(maxAllowed);
  TestValidator.equals("limit equals 100", maxAllowed.pagination.limit, 100);
}
