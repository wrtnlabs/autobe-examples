import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundRequest";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test pagination and sorting behavior for refund request listing.
 *
 * This test validates:
 * 1. Pagination metadata accuracy (current, limit, records, pages)
 * 2. Page navigation returns distinct results
 * 3. Default sorting order (newest first by requested_at)
 * 4. Limit parameter respects maximum of 100
 * 5. Pagination calculations are correct
 */
export async function test_api_refund_request_list_pagination_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // 2. Test page 1 with limit 10
  const page1 =
    await api.functional.shoppingMall.customer.refund_requests.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallRefundRequest.IRequest,
      },
    );
  typia.assert(page1);
  TestValidator.equals("page 1 current", page1.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1.pagination.limit, 10);
  TestValidator.predicate("page 1 has data", page1.pagination.records >= 0);
  // 3. Test page 2 with limit 10
  const page2 =
    await api.functional.shoppingMall.customer.refund_requests.index(
      customerConnection,
      {
        body: {
          page: 2,
          limit: 10,
        } satisfies IShoppingMallRefundRequest.IRequest,
      },
    );
  typia.assert(page2);
  TestValidator.equals("page 2 current", page2.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2.pagination.limit, 10);
  // 4. Verify pages have different data (no duplicates)
  const page1Ids = page1.data.map((r) => r.id);
  const page2Ids = page2.data.map((r) => r.id);
  const hasOverlap = page1Ids.some((id) => page2Ids.includes(id));
  TestValidator.predicate(
    "page 1 and page 2 have no overlapping IDs",
    !hasOverlap,
  );
  // 5. Test maximum limit (100)
  const maxLimit =
    await api.functional.shoppingMall.customer.refund_requests.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IShoppingMallRefundRequest.IRequest,
      },
    );
  typia.assert(maxLimit);
  TestValidator.equals("max limit current", maxLimit.pagination.current, 1);
  TestValidator.equals("max limit limit", maxLimit.pagination.limit, 100);
  // 6. Verify pagination.pages calculation
  const expectedPages =
    page1.pagination.records === 0
      ? 0
      : Math.ceil(page1.pagination.records / page1.pagination.limit);
  TestValidator.equals(
    "pages calculation correct",
    page1.pagination.pages,
    expectedPages,
  );
  // 7. Verify sorting order (newest first)
  if (page1.data.length > 1) {
    const firstRequested = new Date(page1.data[0].requested_at).getTime();
    const lastRequested = new Date(
      page1.data[page1.data.length - 1].requested_at,
    ).getTime();
    TestValidator.predicate(
      "results sorted by requested_at DESC",
      firstRequested >= lastRequested,
    );
  }
  // 8. Test with status filter
  const filtered =
    await api.functional.shoppingMall.customer.refund_requests.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 10,
          status: "pending",
        } satisfies IShoppingMallRefundRequest.IRequest,
      },
    );
  typia.assert(filtered);
  TestValidator.equals("filtered current", filtered.pagination.current, 1);
  TestValidator.equals("filtered limit", filtered.pagination.limit, 10);
  // All filtered results should have status 'pending'
  const allPending = filtered.data.every((r) => r.status === "pending");
  TestValidator.predicate(
    "all filtered results have status pending",
    allPending,
  );
  // 9. Test date range filtering
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const dateFiltered =
    await api.functional.shoppingMall.customer.refund_requests.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 10,
          requestedAtFrom: oneWeekAgo.toISOString(),
          requestedAtTo: now.toISOString(),
        } satisfies IShoppingMallRefundRequest.IRequest,
      },
    );
  typia.assert(dateFiltered);
  TestValidator.equals(
    "date filtered current",
    dateFiltered.pagination.current,
    1,
  );
  TestValidator.equals(
    "date filtered limit",
    dateFiltered.pagination.limit,
    10,
  );
  // 10. Test invalid page number (page 0 should be rejected or defaulted)
  await TestValidator.error("invalid page 0 should error", async () => {
    await api.functional.shoppingMall.customer.refund_requests.index(
      customerConnection,
      {
        body: {
          page: 0 as unknown as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10,
        } satisfies IShoppingMallRefundRequest.IRequest,
      },
    );
  });
}
