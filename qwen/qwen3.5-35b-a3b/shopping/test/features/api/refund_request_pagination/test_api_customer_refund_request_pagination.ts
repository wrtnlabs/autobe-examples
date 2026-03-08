import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallRefundRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_refund_request_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer setup
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customer);
  // Create customer-specific connection with token
  const customerAuthConnection: api.IConnection = {
    host: connection.host,
    headers: {
      ...customerConnection.headers,
      Authorization: customer.token.access,
    },
  };
  // Test 1: Basic pagination with limit: 5
  const page1 =
    await api.functional.ecommerceMall.customer.refund_requests.index(
      customerAuthConnection,
      {
        body: {
          limit: 5,
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(page1);
  // Verify pagination metadata
  TestValidator.equals("page 1 current", page1.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1.pagination.limit, 5);
  TestValidator.predicate(
    "page 1 has at least 5 records or empty",
    page1.pagination.records === 0 || page1.pagination.records >= 5,
  );
  TestValidator.predicate(
    "page 1 data count matches limit or less",
    page1.data.length <= 5,
  );
  // Store data from page 1 for duplicate checking
  const page1Data = [...page1.data];
  // Get cursor from response if available
  const hasCursor = page1.pagination.pages > page1.pagination.current;
  if (hasCursor) {
    // Skip cursor-based pagination test if cursor is not provided
  }
  // Test 2: Second page with page number instead of cursor
  const page2 =
    await api.functional.ecommerceMall.customer.refund_requests.index(
      customerAuthConnection,
      {
        body: {
          limit: 5,
          page: 2,
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(page2);
  // Verify second page metadata
  TestValidator.equals("page 2 current", page2.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2.pagination.limit, 5);
  TestValidator.equals(
    "page 2 records",
    page2.pagination.records,
    page1.pagination.records,
  );
  // Verify no duplicates between pages
  const page1Ids = new Set(page1Data.map((item) => item.id));
  const page2Ids = new Set(page2.data.map((item) => item.id));
  const duplicates = page2.data.filter((item) => page1Ids.has(item.id));
  TestValidator.equals(
    "no duplicate items between pages",
    duplicates.length,
    0,
  );
  // Test 3: Filter by status with pagination
  const pendingPage =
    await api.functional.ecommerceMall.customer.refund_requests.index(
      customerAuthConnection,
      {
        body: {
          limit: 3,
          request_status: "pending",
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(pendingPage);
  TestValidator.equals(
    "filtered page current",
    pendingPage.pagination.current,
    1,
  );
  TestValidator.equals("filtered page limit", pendingPage.pagination.limit, 3);
  TestValidator.predicate(
    "filtered records matches data count",
    pendingPage.pagination.records === pendingPage.data.length,
  );
  // Verify all items are pending
  pendingPage.data.forEach((item: IEcommerceMallRefundRequest.ISummary) => {
    TestValidator.equals(
      "item status is pending",
      item.request_status,
      "pending",
    );
  });
  // Test 4: Date range with pagination
  const now = new Date();
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const dateFilteredPage =
    await api.functional.ecommerceMall.customer.refund_requests.index(
      customerAuthConnection,
      {
        body: {
          limit: 4,
          created_at_gte: threeDaysAgo.toISOString(),
          created_at_lte: now.toISOString(),
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(dateFilteredPage);
  TestValidator.equals(
    "date filtered page current",
    dateFilteredPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "date filtered page limit",
    dateFilteredPage.pagination.limit,
    4,
  );
  TestValidator.predicate(
    "date filtered records matches data count",
    dateFilteredPage.pagination.records === dateFilteredPage.data.length,
  );
  // Verify all items are within date range
  dateFilteredPage.data.forEach(
    (item: IEcommerceMallRefundRequest.ISummary) => {
      const itemDate = new Date(item.created_at);
      TestValidator.predicate(
        "item created_at within date range",
        itemDate >= threeDaysAgo && itemDate <= now,
      );
    },
  );
  // Test 5: Verify pagination metadata consistency
  TestValidator.predicate(
    "pagination pages calculation correct",
    page1.pagination.pages ===
      Math.ceil(page1.pagination.records / page1.pagination.limit),
  );
  // Test 6: Verify hasNextCursor logic through pages check
  const hasNextPage = page1.pagination.current < page1.pagination.pages;
  TestValidator.equals(
    "has next page logic correct",
    hasNextPage,
    page1.pagination.pages > 1,
  );
}
