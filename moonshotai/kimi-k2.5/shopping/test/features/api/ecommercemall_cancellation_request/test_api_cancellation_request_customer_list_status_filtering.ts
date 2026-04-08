import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCancellationRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_cancellation_request_customer_list_status_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create authenticated customer connection
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Test 1: Filter by single status (pending)
  const pendingFilter: IEcommerceMallCancellationRequest.IRequest = {
    status: "pending",
    page: 1,
    limit: 10,
  } satisfies IEcommerceMallCancellationRequest.IRequest;
  const pendingResult =
    await api.functional.ecommerceMall.customer.cancellation_requests.index(
      customerConnection,
      { body: pendingFilter },
    );
  typia.assert(pendingResult);
  // Verify all returned results have "pending" status
  TestValidator.predicate("all filtered results have pending status", () =>
    pendingResult.data.every((item) => item.status === "pending"),
  );
  // Test 2: Filter by approved status
  const approvedFilter: IEcommerceMallCancellationRequest.IRequest = {
    status: "approved",
    page: 1,
    limit: 10,
  } satisfies IEcommerceMallCancellationRequest.IRequest;
  const approvedResult =
    await api.functional.ecommerceMall.customer.cancellation_requests.index(
      customerConnection,
      { body: approvedFilter },
    );
  typia.assert(approvedResult);
  TestValidator.predicate("all filtered results have approved status", () =>
    approvedResult.data.every((item) => item.status === "approved"),
  );
  // Test 3: Filter by rejected status
  const rejectedFilter: IEcommerceMallCancellationRequest.IRequest = {
    status: "rejected",
    page: 1,
    limit: 10,
  } satisfies IEcommerceMallCancellationRequest.IRequest;
  const rejectedResult =
    await api.functional.ecommerceMall.customer.cancellation_requests.index(
      customerConnection,
      { body: rejectedFilter },
    );
  typia.assert(rejectedResult);
  TestValidator.predicate("all filtered results have rejected status", () =>
    rejectedResult.data.every((item) => item.status === "rejected"),
  );
  // Test 4: Filter by date range
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const dateRangeFilter: IEcommerceMallCancellationRequest.IRequest = {
    createdAtFrom: oneWeekAgo.toISOString(),
    createdAtTo: now.toISOString(),
    page: 1,
    limit: 10,
  } satisfies IEcommerceMallCancellationRequest.IRequest;
  const dateRangeResult =
    await api.functional.ecommerceMall.customer.cancellation_requests.index(
      customerConnection,
      { body: dateRangeFilter },
    );
  typia.assert(dateRangeResult);
  // Verify all results fall within the date range
  TestValidator.predicate("all filtered results fall within date range", () =>
    dateRangeResult.data.every((item) => {
      const createdAt = new Date(item.createdAt);
      return createdAt >= oneWeekAgo && createdAt <= now;
    }),
  );
  // Test 5: Combined filters (status + date range) with AND logic
  const combinedFilter: IEcommerceMallCancellationRequest.IRequest = {
    status: "pending",
    createdAtFrom: oneWeekAgo.toISOString(),
    createdAtTo: now.toISOString(),
    page: 1,
    limit: 10,
  } satisfies IEcommerceMallCancellationRequest.IRequest;
  const combinedResult =
    await api.functional.ecommerceMall.customer.cancellation_requests.index(
      customerConnection,
      { body: combinedFilter },
    );
  typia.assert(combinedResult);
  // Verify all results match both status and date range (AND logic)
  TestValidator.predicate(
    "all filtered results match both status and date range",
    () =>
      combinedResult.data.every((item) => {
        const createdAt = new Date(item.createdAt);
        return (
          item.status === "pending" &&
          createdAt >= oneWeekAgo &&
          createdAt <= now
        );
      }),
  );
  // Test 6: Verify pagination works correctly with filtered results
  const paginationFilter: IEcommerceMallCancellationRequest.IRequest = {
    status: "pending",
    page: 1,
    limit: 5,
  } satisfies IEcommerceMallCancellationRequest.IRequest;
  const page1Result =
    await api.functional.ecommerceMall.customer.cancellation_requests.index(
      customerConnection,
      { body: paginationFilter },
    );
  typia.assert(page1Result);
  // Verify pagination metadata
  TestValidator.equals(
    "pagination current page",
    page1Result.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", page1Result.pagination.limit, 5);
  TestValidator.predicate(
    "data length within limit",
    () => page1Result.data.length <= 5,
  );
  // If there's more data, test page 2
  if (page1Result.pagination.pages > 1) {
    const page2Filter: IEcommerceMallCancellationRequest.IRequest = {
      status: "pending",
      page: 2,
      limit: 5,
    } satisfies IEcommerceMallCancellationRequest.IRequest;
    const page2Result =
      await api.functional.ecommerceMall.customer.cancellation_requests.index(
        customerConnection,
        { body: page2Filter },
      );
    typia.assert(page2Result);
    TestValidator.equals(
      "page 2 current page",
      page2Result.pagination.current,
      2,
    );
    TestValidator.predicate(
      "page 2 data length within limit",
      () => page2Result.data.length <= 5,
    );
    // Verify page 2 results are different from page 1 (no overlap)
    const page1Ids = new Set(page1Result.data.map((item) => item.id));
    const hasOverlap = page2Result.data.some((item) => page1Ids.has(item.id));
    TestValidator.predicate(
      "page 2 results are different from page 1",
      () => !hasOverlap,
    );
  }
}
