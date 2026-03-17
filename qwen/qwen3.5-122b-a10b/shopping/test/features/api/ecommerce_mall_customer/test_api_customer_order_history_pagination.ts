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

/**
 * Test customer order history pagination functionality.
 *
 * This test validates that the customer order list endpoint correctly implements
 * pagination with proper metadata, consistent ordering, and various limit/page combinations.
 */
export async function test_api_customer_order_history_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: null,
      phone_number: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Test default pagination (page 0, default limit)
  const firstPage = await api.functional.ecommerceMall.customer.orders.index(
    customerConnection,
    {
      body: {
        page: 0,
        limit: 20,
      } satisfies IEcommerceMallOrder.IRequest,
    },
  );
  typia.assert(firstPage);
  // Validate pagination metadata
  TestValidator.equals("first page current", firstPage.pagination.current, 1); // 1-indexed in response
  TestValidator.equals("first page limit", firstPage.pagination.limit, 20);
  TestValidator.predicate(
    "has total records",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate("has total pages", firstPage.pagination.pages >= 0);
  // Validate data array structure
  TestValidator.predicate("data is array", Array.isArray(firstPage.data));
  // If there are orders, validate order structure
  if (firstPage.data.length > 0) {
    const firstOrder = firstPage.data[0];
    TestValidator.predicate("order has id", firstOrder.id !== undefined);
    TestValidator.predicate(
      "order has orderNumber",
      firstOrder.orderNumber !== undefined,
    );
    TestValidator.predicate(
      "order has status",
      firstOrder.status !== undefined,
    );
    TestValidator.predicate(
      "order has totalPrice",
      firstOrder.totalPrice !== undefined,
    );
    TestValidator.predicate(
      "order has createdAt",
      firstOrder.createdAt !== undefined,
    );
    TestValidator.predicate(
      "order has itemCount",
      firstOrder.itemCount !== undefined,
    );
    TestValidator.predicate(
      "order has customer",
      firstOrder.customer !== undefined,
    );
  }
  // 3. Test with different limit values
  const smallLimitPage =
    await api.functional.ecommerceMall.customer.orders.index(
      customerConnection,
      {
        body: {
          page: 0,
          limit: 5,
        } satisfies IEcommerceMallOrder.IRequest,
      },
    );
  typia.assert(smallLimitPage);
  TestValidator.equals(
    "small limit page limit",
    smallLimitPage.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "small limit respects limit",
    smallLimitPage.data.length <= 5,
  );
  const largeLimitPage =
    await api.functional.ecommerceMall.customer.orders.index(
      customerConnection,
      {
        body: {
          page: 0,
          limit: 100,
        } satisfies IEcommerceMallOrder.IRequest,
      },
    );
  typia.assert(largeLimitPage);
  TestValidator.equals(
    "large limit page limit",
    largeLimitPage.pagination.limit,
    100,
  );
  // 4. Test pagination across multiple pages
  if (firstPage.pagination.pages > 1) {
    const secondPage = await api.functional.ecommerceMall.customer.orders.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallOrder.IRequest,
      },
    );
    typia.assert(secondPage);
    TestValidator.equals(
      "second page current",
      secondPage.pagination.current,
      2,
    );
    TestValidator.equals("second page limit", secondPage.pagination.limit, 20);
    // Verify no duplicate orders between pages
    const firstPageIds = new Set(firstPage.data.map((o) => o.id));
    const secondPageIds = new Set(secondPage.data.map((o) => o.id));
    const duplicates = firstPage.data.filter((o) => secondPageIds.has(o.id));
    TestValidator.equals(
      "no duplicate orders across pages",
      duplicates.length,
      0,
    );
    // Verify ordering (created_at DESC, id DESC)
    if (firstPage.data.length > 0 && secondPage.data.length > 0) {
      const lastFirstPageOrder = firstPage.data[firstPage.data.length - 1];
      const firstSecondPageOrder = secondPage.data[0];
      // Last order on first page should be older or equal to first order on second page
      const firstPageLastTime = new Date(
        lastFirstPageOrder.createdAt,
      ).getTime();
      const secondPageFirstTime = new Date(
        firstSecondPageOrder.createdAt,
      ).getTime();
      TestValidator.predicate(
        "page 1 last order older than page 2 first order",
        firstPageLastTime >= secondPageFirstTime,
      );
    }
  }
  // 5. Test with status filter
  const filteredPage = await api.functional.ecommerceMall.customer.orders.index(
    customerConnection,
    {
      body: {
        page: 0,
        limit: 10,
        status: "paid",
      } satisfies IEcommerceMallOrder.IRequest,
    },
  );
  typia.assert(filteredPage);
  // All returned orders should have the filtered status (if any orders exist)
  if (filteredPage.data.length > 0) {
    const allMatchStatus = filteredPage.data.every(
      (order) => order.status === "paid",
    );
    TestValidator.predicate("all filtered orders match status", allMatchStatus);
  }
  // 6. Test with date range filter
  const dateFrom = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const dateTo = new Date().toISOString();
  const dateFilteredPage =
    await api.functional.ecommerceMall.customer.orders.index(
      customerConnection,
      {
        body: {
          page: 0,
          limit: 10,
          dateFrom,
          dateTo,
        } satisfies IEcommerceMallOrder.IRequest,
      },
    );
  typia.assert(dateFilteredPage);
  // All returned orders should be within the date range (if any orders exist)
  if (dateFilteredPage.data.length > 0) {
    const allInRange = dateFilteredPage.data.every((order) => {
      const orderTime = new Date(order.createdAt).getTime();
      const fromTime = new Date(dateFrom).getTime();
      const toTime = new Date(dateTo).getTime();
      return orderTime >= fromTime && orderTime <= toTime;
    });
    TestValidator.predicate("all date-filtered orders in range", allInRange);
  }
  // 7. Test with order number search
  if (firstPage.data.length > 0) {
    const sampleOrder = firstPage.data[0];
    const searchPartial = sampleOrder.orderNumber.substring(0, 8);
    const searchPage = await api.functional.ecommerceMall.customer.orders.index(
      customerConnection,
      {
        body: {
          page: 0,
          limit: 10,
          orderNumber: searchPartial,
        } satisfies IEcommerceMallOrder.IRequest,
      },
    );
    typia.assert(searchPage);
    // All returned orders should contain the search string (if any orders exist)
    if (searchPage.data.length > 0) {
      const allMatchSearch = searchPage.data.every((order) =>
        order.orderNumber.includes(searchPartial),
      );
      TestValidator.predicate(
        "all searched orders match pattern",
        allMatchSearch,
      );
    }
  }
  // 8. Test sorting (created_at DESC by default)
  const sortedPage = await api.functional.ecommerceMall.customer.orders.index(
    customerConnection,
    {
      body: {
        page: 0,
        limit: 10,
        sort: "created_at",
        order: "desc",
      } satisfies IEcommerceMallOrder.IRequest,
    },
  );
  typia.assert(sortedPage);
  // Verify descending order
  if (sortedPage.data.length > 1) {
    for (let i = 0; i < sortedPage.data.length - 1; i++) {
      const current = new Date(sortedPage.data[i].createdAt).getTime();
      const next = new Date(sortedPage.data[i + 1].createdAt).getTime();
      TestValidator.predicate(
        `order ${i} older than or equal to order ${i + 1}`,
        current >= next,
      );
    }
  }
  // 9. Test sorting ascending
  const ascPage = await api.functional.ecommerceMall.customer.orders.index(
    customerConnection,
    {
      body: {
        page: 0,
        limit: 10,
        sort: "created_at",
        order: "asc",
      } satisfies IEcommerceMallOrder.IRequest,
    },
  );
  typia.assert(ascPage);
  // Verify ascending order
  if (ascPage.data.length > 1) {
    for (let i = 0; i < ascPage.data.length - 1; i++) {
      const current = new Date(ascPage.data[i].createdAt).getTime();
      const next = new Date(ascPage.data[i + 1].createdAt).getTime();
      TestValidator.predicate(
        `asc order ${i} older than or equal to asc order ${i + 1}`,
        current <= next,
      );
    }
  }
  // 10. Test sorting by total_price
  const priceSortedPage =
    await api.functional.ecommerceMall.customer.orders.index(
      customerConnection,
      {
        body: {
          page: 0,
          limit: 10,
          sort: "total_price",
          order: "desc",
        } satisfies IEcommerceMallOrder.IRequest,
      },
    );
  typia.assert(priceSortedPage);
  // Verify price sorting
  if (priceSortedPage.data.length > 1) {
    for (let i = 0; i < priceSortedPage.data.length - 1; i++) {
      const current = priceSortedPage.data[i].totalPrice;
      const next = priceSortedPage.data[i + 1].totalPrice;
      TestValidator.predicate(
        `price order ${i} >= price order ${i + 1}`,
        current >= next,
      );
    }
  }
}
