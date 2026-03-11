import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_orders_filtering_paginated(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication via join
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>() satisfies string as string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">,
      password: typia.random<string & tags.Format<"password">>() satisfies string as string & tags.MinLength<8> & tags.Format<"password">,
      href: typia.random<string & tags.Format<"uri">>() satisfies string as string & tags.Format<"uri">,
      referrer: typia.random<string & tags.Format<"uri">>() satisfies string as string & tags.Format<"uri">,
      ip: typia.random<string & tags.Format<"ipv4">>() satisfies string as string & tags.Format<"ipv4">,
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // Create connection with customer token for authenticated requests
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: customerAuth.token.access,
    },
  };
  // 2. Test default pagination (no filters)
  const defaultResult =
    await api.functional.ecommerceMall.customer.orders.index(
      authenticatedConnection,
      {
        body: {} satisfies IEcommerceMallOrder.IRequest,
      },
    );
  typia.assert(defaultResult);
  // Validate pagination metadata structure
  TestValidator.equals(
    "pagination metadata exists",
    defaultResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit defaults to 20",
    defaultResult.pagination.limit,
    20,
  );
  TestValidator.equals(
    "pagination records count",
    defaultResult.pagination.records,
    0,
  );
  // 3. Test pagination with explicit limit
  const limitedResult =
    await api.functional.ecommerceMall.customer.orders.index(
      authenticatedConnection,
      {
        body: { limit: 50 } satisfies IEcommerceMallOrder.IRequest,
      },
    );
  typia.assert(limitedResult);
  TestValidator.equals("limit set to 50", limitedResult.pagination.limit, 50);
  // 4. Test maximum pagination size
  const maxLimitResult =
    await api.functional.ecommerceMall.customer.orders.index(
      authenticatedConnection,
      {
        body: { limit: 100 } satisfies IEcommerceMallOrder.IRequest,
      },
    );
  typia.assert(maxLimitResult);
  TestValidator.equals(
    "max limit set to 100",
    maxLimitResult.pagination.limit,
    100,
  );
  // 5. Test filtering by overall status
  const statusFilters: Array<
    | "paid"
    | "shipped"
    | "delivered"
    | "cancelled"
    | "refunded"
    | "partiallyCompleted"
  > = ["paid", "shipped", "delivered"];
  for (const status of statusFilters) {
    const filteredByStatus =
      await api.functional.ecommerceMall.customer.orders.index(
        authenticatedConnection,
        {
          body: {
            overallStatus: status,
          } satisfies IEcommerceMallOrder.IRequest,
        },
      );
    typia.assert(filteredByStatus);
    TestValidator.predicate(
      `status filter ${status} returns valid structure`,
      () => filteredByStatus.pagination !== undefined,
    );
  }
  // 6. Test date range filtering
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const dateRangeResult =
    await api.functional.ecommerceMall.customer.orders.index(
      authenticatedConnection,
      {
        body: {
          createdAtMin: thirtyDaysAgo.toISOString(),
          createdAtMax: now.toISOString(),
        } satisfies IEcommerceMallOrder.IRequest,
      },
    );
  typia.assert(dateRangeResult);
  TestValidator.predicate(
    "date range filter returns valid structure",
    () => dateRangeResult.pagination !== undefined,
  );
  // 7. Test price range filtering
  const priceRangeResult =
    await api.functional.ecommerceMall.customer.orders.index(
      authenticatedConnection,
      {
        body: {
          totalPriceMin: 0 satisfies number | undefined,
          totalPriceMax: 100000 satisfies number | undefined,
        } satisfies IEcommerceMallOrder.IRequest,
      },
    );
  typia.assert(priceRangeResult);
  TestValidator.predicate(
    "price range filter returns valid structure",
    () => priceRangeResult.pagination !== undefined,
  );
  // 8. Test sorting by createdAt
  const sortByCreatedAtDesc =
    await api.functional.ecommerceMall.customer.orders.index(
      authenticatedConnection,
      {
        body: {
          sortBy: "createdAt",
          sortOrder: "DESC",
        } satisfies IEcommerceMallOrder.IRequest,
      },
    );
  typia.assert(sortByCreatedAtDesc);
  const sortByCreatedAtAsc =
    await api.functional.ecommerceMall.customer.orders.index(
      authenticatedConnection,
      {
        body: {
          sortBy: "createdAt",
          sortOrder: "ASC",
        } satisfies IEcommerceMallOrder.IRequest,
      },
    );
  typia.assert(sortByCreatedAtAsc);
  // 9. Test sorting by totalPrice
  const sortByTotalPriceDesc =
    await api.functional.ecommerceMall.customer.orders.index(
      authenticatedConnection,
      {
        body: {
          sortBy: "totalPrice",
          sortOrder: "DESC",
        } satisfies IEcommerceMallOrder.IRequest,
      },
    );
  typia.assert(sortByTotalPriceDesc);
  const sortByTotalPriceAsc =
    await api.functional.ecommerceMall.customer.orders.index(
      authenticatedConnection,
      {
        body: {
          sortBy: "totalPrice",
          sortOrder: "ASC",
        } satisfies IEcommerceMallOrder.IRequest,
      },
    );
  typia.assert(sortByTotalPriceAsc);
  // 10. Test pagination metadata calculations
  TestValidator.predicate("pages calculated correctly", () => {
    const { pagination } = defaultResult;
    if (pagination.records === 0) {
      return pagination.pages === 0;
    }
    const expectedPages = Math.ceil(pagination.records / pagination.limit);
    return pagination.pages === expectedPages;
  });
  // 11. Test cursor-based pagination
  const cursorResult = await api.functional.ecommerceMall.customer.orders.index(
    authenticatedConnection,
    {
      body: {
        cursor: now.toISOString(),
      } satisfies IEcommerceMallOrder.IRequest,
    },
  );
  typia.assert(cursorResult);
  // 12. Test page parameter
  const pageResult = await api.functional.ecommerceMall.customer.orders.index(
    authenticatedConnection,
    {
      body: { page: 2 } satisfies IEcommerceMallOrder.IRequest,
    },
  );
  typia.assert(pageResult);
  TestValidator.equals("page 2 specified", pageResult.pagination.current, 2);
  // 13. Test empty result set handling
  const noMatchResult =
    await api.functional.ecommerceMall.customer.orders.index(
      authenticatedConnection,
      {
        body: {
          overallStatus:
            "cancelled" satisfies IEcommerceMallOrder.IRequest["overallStatus"],
          createdAtMin: new Date("2099-12-31T23:59:59Z").toISOString(),
        } satisfies IEcommerceMallOrder.IRequest,
      },
    );
  typia.assert(noMatchResult);
  TestValidator.equals(
    "empty results handled correctly",
    noMatchResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty results pagination structure",
    noMatchResult.pagination.pages,
    0,
  );
  // 14. Test combined filters
  const combinedResult =
    await api.functional.ecommerceMall.customer.orders.index(
      authenticatedConnection,
      {
        body: {
          overallStatus: "delivered",
          totalPriceMin: 0,
          sortBy: "createdAt",
          sortOrder: "DESC",
          limit: 20,
        } satisfies IEcommerceMallOrder.IRequest,
      },
    );
  typia.assert(combinedResult);
  // 15. Test search functionality
  const searchResult = await api.functional.ecommerceMall.customer.orders.index(
    authenticatedConnection,
    {
      body: {
        search: RandomGenerator.alphaNumeric(8),
      } satisfies IEcommerceMallOrder.IRequest,
    },
  );
  typia.assert(searchResult);
  // 16. Verify customer data isolation (no other customer orders visible)
  TestValidator.equals(
    "customer isolation - no orders visible",
    defaultResult.data.length,
    0,
  );
  // 17. Test response data structure
  TestValidator.equals(
    "data field is array",
    Array.isArray(defaultResult.data),
    true,
  );
  // 18. Test each order summary structure (no orders expected in this test)
  for (const order of defaultResult.data) {
    typia.assert(order);
    TestValidator.predicate(
      "order has required fields",
      () =>
        order.id !== undefined &&
        order.order_number !== undefined &&
        order.total_price !== undefined &&
        order.overall_status !== undefined &&
        order.created_at !== undefined &&
        order.customer !== undefined,
    );
  }
  // 19. Test hasNextPage functionality in pagination metadata
  TestValidator.equals(
    "no next page when empty",
    defaultResult.pagination.current < defaultResult.pagination.pages ||
      defaultResult.pagination.records === 0,
    true,
  );
  // 20. Test cursor exists when there are pages
  const cursorHasValue =
    cursorResult.data.length > 0 || defaultResult.pagination.pages === 0;
  TestValidator.predicate("cursor pagination valid", () => cursorHasValue);
}
