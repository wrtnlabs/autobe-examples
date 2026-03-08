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

export async function test_api_customer_order_history_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // ============================================
  // 1. Customer Authentication Setup
  // ============================================
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth: IEcommerceMallCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: null,
      } satisfies IEcommerceMallCustomer.IJoin,
    });
  typia.assert(customerAuth);
  // ============================================
  // 2. Second Customer for Authorization Isolation Test
  // ============================================
  const otherCustomerConnection: api.IConnection = { host: connection.host };
  const otherCustomerAuth: IEcommerceMallCustomer.IAuthorized =
    await authorize_customer_join(otherCustomerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: null,
      } satisfies IEcommerceMallCustomer.IJoin,
    });
  typia.assert(otherCustomerAuth);
  // ============================================
  // 3. Default Order List (Empty - No Orders Yet)
  // ============================================
  const emptyResult: IPageIEcommerceMallOrder.ISummary =
    await api.functional.ecommerceMall.customer.orders.index(
      customerConnection,
      {
        body: {} satisfies IEcommerceMallOrder.IRequest,
      },
    );
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty result has 0 records",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty result has 0 pages",
    emptyResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty result data is empty array",
    emptyResult.data.length,
    0,
  );
  // ============================================
  // 4. Test Status Filter with Various Statuses
  // ============================================
  const statusFilters: string[] = [
    "paid",
    "shipped",
    "delivered",
    "cancelled",
    "refunded",
    "partiallyCompleted",
  ];
  await ArrayUtil.asyncForEach(statusFilters, async (status) => {
    const statusFiltered: IPageIEcommerceMallOrder.ISummary =
      await api.functional.ecommerceMall.customer.orders.index(
        customerConnection,
        {
          body: {
            status,
            page: 0,
            limit: 20,
          } satisfies IEcommerceMallOrder.IRequest,
        },
      );
    typia.assert(statusFiltered);
    TestValidator.equals(
      `status filter "${status}" returns valid pagination`,
      statusFiltered.pagination.current >= 0,
      true,
    );
    TestValidator.equals(
      `status filter "${status}" returns valid limit`,
      statusFiltered.pagination.limit > 0,
      true,
    );
  });
  // ============================================
  // 5. Test Order Number Partial Match Search
  // ============================================
  const orderNumberSearch: IPageIEcommerceMallOrder.ISummary =
    await api.functional.ecommerceMall.customer.orders.index(
      customerConnection,
      {
        body: {
          orderNumber: "ORD",
          page: 0,
          limit: 20,
        } satisfies IEcommerceMallOrder.IRequest,
      },
    );
  typia.assert(orderNumberSearch);
  // All returned orders should have order number containing the search term
  for (const order of orderNumberSearch.data) {
    TestValidator.predicate(
      `order number contains search term "${order.orderNumber}"`,
      order.orderNumber.toLowerCase().includes("ord".toLowerCase()),
    );
  }
  // ============================================
  // 6. Test Date Range Filter
  // ============================================
  const now: Date = new Date();
  const dateFrom: string & tags.Format<"date-time"> = new Date(
    now.getTime() - 1000 * 60 * 60 * 24 * 30,
  ).toISOString() as string & tags.Format<"date-time">;
  const dateTo: string & tags.Format<"date-time"> =
    now.toISOString() as string & tags.Format<"date-time">;
  const dateFiltered: IPageIEcommerceMallOrder.ISummary =
    await api.functional.ecommerceMall.customer.orders.index(
      customerConnection,
      {
        body: {
          dateFrom,
          dateTo,
          page: 0,
          limit: 20,
        } satisfies IEcommerceMallOrder.IRequest,
      },
    );
  typia.assert(dateFiltered);
  // All returned orders should be within the date range
  for (const order of dateFiltered.data) {
    const orderDate: Date = new Date(order.createdAt);
    TestValidator.predicate(
      `order created at is after dateFrom`,
      orderDate >= new Date(dateFrom),
    );
    TestValidator.predicate(
      `order created at is before dateTo`,
      orderDate <= new Date(dateTo),
    );
  }
  // ============================================
  // 7. Test Combined Filters
  // ============================================
  const combinedFiltered: IPageIEcommerceMallOrder.ISummary =
    await api.functional.ecommerceMall.customer.orders.index(
      customerConnection,
      {
        body: {
          status: "paid",
          orderNumber: "ORD",
          dateFrom,
          dateTo,
          page: 0,
          limit: 20,
          sort: "created_at",
          order: "desc",
        } satisfies IEcommerceMallOrder.IRequest,
      },
    );
  typia.assert(combinedFiltered);
  TestValidator.equals(
    "combined filter returns valid pagination",
    combinedFiltered.pagination.current >= 0,
    true,
  );
  // ============================================
  // 8. Test Pagination
  // ============================================
  const paginated: IPageIEcommerceMallOrder.ISummary =
    await api.functional.ecommerceMall.customer.orders.index(
      customerConnection,
      {
        body: {
          page: 0,
          limit: 10,
        } satisfies IEcommerceMallOrder.IRequest,
      },
    );
  typia.assert(paginated);
  TestValidator.equals(
    "pagination current is 0-indexed",
    paginated.pagination.current,
    0,
  );
  TestValidator.equals(
    "pagination limit is 10",
    paginated.pagination.limit,
    10,
  );
  TestValidator.equals(
    "pagination records is non-negative",
    paginated.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "pagination pages is non-negative",
    paginated.pagination.pages >= 0,
    true,
  );
  // Test second page
  const pageTwo: IPageIEcommerceMallOrder.ISummary =
    await api.functional.ecommerceMall.customer.orders.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallOrder.IRequest,
      },
    );
  typia.assert(pageTwo);
  TestValidator.equals(
    "second page current is 1",
    pageTwo.pagination.current,
    1,
  );
  // ============================================
  // 9. Test Order Summary Fields
  // ============================================
  for (const order of paginated.data) {
    typia.assert(order);
    TestValidator.equals("order has id", typeof order.id, "string");
    TestValidator.equals(
      "order has orderNumber",
      typeof order.orderNumber,
      "string",
    );
    TestValidator.equals("order has status", typeof order.status, "string");
    TestValidator.equals(
      "order has totalPrice",
      typeof order.totalPrice,
      "number",
    );
    TestValidator.equals(
      "order has createdAt",
      typeof order.createdAt,
      "string",
    );
    TestValidator.equals(
      "order has itemCount",
      typeof order.itemCount,
      "number",
    );
    TestValidator.equals("order has customer", typeof order.customer, "object");
    // Validate customer summary fields
    TestValidator.equals("customer has id", typeof order.customer.id, "string");
    TestValidator.equals(
      "customer has email",
      typeof order.customer.email,
      "string",
    );
    TestValidator.equals(
      "customer has account_status",
      typeof order.customer.account_status,
      "string",
    );
    TestValidator.equals(
      "customer has created_at",
      typeof order.customer.created_at,
      "string",
    );
  }
  // ============================================
  // 10. Test Authorization Isolation
  // ============================================
  const otherCustomerOrders: IPageIEcommerceMallOrder.ISummary =
    await api.functional.ecommerceMall.customer.orders.index(
      otherCustomerConnection,
      {
        body: {} satisfies IEcommerceMallOrder.IRequest,
      },
    );
  typia.assert(otherCustomerOrders);
  // Other customer should not see first customer's orders
  TestValidator.predicate(
    "other customer cannot see first customer's orders",
    otherCustomerOrders.data.every(
      (order) => order.customer.id !== customerAuth.id,
    ),
  );
  // First customer should not see other customer's orders
  TestValidator.predicate(
    "first customer cannot see other customer's orders",
    paginated.data.every((order) => order.customer.id !== otherCustomerAuth.id),
  );
  // ============================================
  // 11. Test Sorting
  // ============================================
  const sortedDesc: IPageIEcommerceMallOrder.ISummary =
    await api.functional.ecommerceMall.customer.orders.index(
      customerConnection,
      {
        body: {
          sort: "created_at",
          order: "desc",
          page: 0,
          limit: 20,
        } satisfies IEcommerceMallOrder.IRequest,
      },
    );
  typia.assert(sortedDesc);
  const sortedAsc: IPageIEcommerceMallOrder.ISummary =
    await api.functional.ecommerceMall.customer.orders.index(
      customerConnection,
      {
        body: {
          sort: "created_at",
          order: "asc",
          page: 0,
          limit: 20,
        } satisfies IEcommerceMallOrder.IRequest,
      },
    );
  typia.assert(sortedAsc);
  // Verify descending order (newest first)
  if (sortedDesc.data.length > 1) {
    for (let i = 0; i < sortedDesc.data.length - 1; i++) {
      TestValidator.predicate(
        `descending order - order ${i} is newer than order ${i + 1}`,
        new Date(sortedDesc.data[i].createdAt) >=
          new Date(sortedDesc.data[i + 1].createdAt),
      );
    }
  }
  // Verify ascending order (oldest first)
  if (sortedAsc.data.length > 1) {
    for (let i = 0; i < sortedAsc.data.length - 1; i++) {
      TestValidator.predicate(
        `ascending order - order ${i} is older than order ${i + 1}`,
        new Date(sortedAsc.data[i].createdAt) <=
          new Date(sortedAsc.data[i + 1].createdAt),
      );
    }
  }
}
