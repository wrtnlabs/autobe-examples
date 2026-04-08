import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDateRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IDateRange";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequestSnapshot";
import type { IEcommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerAddress";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCancellationRequestSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_cancellation_request_snapshots_filter_by_response_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(seller);
  // 2. Test response_status='approved' filter
  // Note: The endpoint filters by seller response status (approved/rejected/pending)
  const approvedFilter = {
    actor_type: "customer",
    response_status: "approved",
    limit: 10,
  } satisfies IEcommerceMallCancellationRequestSnapshot.IRequest;
  const approvedResult =
    await api.functional.ecommerceMall.seller.cancellation_request_snapshots.index(
      sellerConnection,
      { body: approvedFilter },
    );
  typia.assert(approvedResult);
  // Verify all approved snapshots have approved_at populated and rejected_at null
  for (const snapshot of approvedResult.data) {
    TestValidator.predicate(
      "approved snapshot has approved_at",
      snapshot.approved_at !== undefined && snapshot.approved_at !== null,
    );
    TestValidator.predicate(
      "approved snapshot has null rejected_at",
      snapshot.rejected_at === undefined || snapshot.rejected_at === null,
    );
  }
  // 3. Test response_status='rejected' filter
  const rejectedFilter = {
    actor_type: "customer",
    response_status: "rejected",
    limit: 10,
  } satisfies IEcommerceMallCancellationRequestSnapshot.IRequest;
  const rejectedResult =
    await api.functional.ecommerceMall.seller.cancellation_request_snapshots.index(
      sellerConnection,
      { body: rejectedFilter },
    );
  typia.assert(rejectedResult);
  // Verify all rejected snapshots have rejected_at populated and approved_at null
  for (const snapshot of rejectedResult.data) {
    TestValidator.predicate(
      "rejected snapshot has rejected_at",
      snapshot.rejected_at !== undefined && snapshot.rejected_at !== null,
    );
    TestValidator.predicate(
      "rejected snapshot has null approved_at",
      snapshot.approved_at === undefined || snapshot.approved_at === null,
    );
  }
  // 4. Test response_status='pending' filter
  const pendingFilter = {
    actor_type: "customer",
    response_status: "pending",
    limit: 10,
  } satisfies IEcommerceMallCancellationRequestSnapshot.IRequest;
  const pendingResult =
    await api.functional.ecommerceMall.seller.cancellation_request_snapshots.index(
      sellerConnection,
      { body: pendingFilter },
    );
  typia.assert(pendingResult);
  // Verify all pending snapshots have both approved_at and rejected_at null
  for (const snapshot of pendingResult.data) {
    TestValidator.predicate(
      "pending snapshot has null approved_at",
      snapshot.approved_at === undefined || snapshot.approved_at === null,
    );
    TestValidator.predicate(
      "pending snapshot has null rejected_at",
      snapshot.rejected_at === undefined || snapshot.rejected_at === null,
    );
  }
  // 5. Test approved_at_range filter
  const now = new Date();
  const threeDaysAgo = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 3);
  const approvedAtRange = {
    actor_type: "customer",
    approved_at_range: {
      gte: threeDaysAgo.toISOString(),
      lte: now.toISOString(),
    },
  } satisfies IEcommerceMallCancellationRequestSnapshot.IRequest;
  const approvedAtRangeResult =
    await api.functional.ecommerceMall.seller.cancellation_request_snapshots.index(
      sellerConnection,
      { body: approvedAtRange },
    );
  typia.assert(approvedAtRangeResult);
  // 6. Test rejected_at_range filter
  const rejectedAtRangeFilter = {
    actor_type: "customer",
    rejected_at_range: {
      gte: threeDaysAgo.toISOString(),
      lte: now.toISOString(),
    },
  } satisfies IEcommerceMallCancellationRequestSnapshot.IRequest;
  const rejectedAtRangeResult =
    await api.functional.ecommerceMall.seller.cancellation_request_snapshots.index(
      sellerConnection,
      { body: rejectedAtRangeFilter },
    );
  typia.assert(rejectedAtRangeResult);
  // 7. Test text search filter - searches title and body fields
  const searchFilter = {
    actor_type: "customer",
    search: "Cancellation Request",
    limit: 10,
  } satisfies IEcommerceMallCancellationRequestSnapshot.IRequest;
  const searchResult =
    await api.functional.ecommerceMall.seller.cancellation_request_snapshots.index(
      sellerConnection,
      { body: searchFilter },
    );
  typia.assert(searchResult);
  // Verify results match search term (if any returned)
  for (const snapshot of searchResult.data) {
    TestValidator.predicate(
      "search matches title",
      snapshot.title.includes("Cancellation Request"),
    );
  }
  // 8. Test pagination with limit parameter
  const paginationFilter = {
    actor_type: "customer",
    limit: 3,
  } satisfies IEcommerceMallCancellationRequestSnapshot.IRequest;
  const paginationResult =
    await api.functional.ecommerceMall.seller.cancellation_request_snapshots.index(
      sellerConnection,
      { body: paginationFilter },
    );
  typia.assert(paginationResult);
  TestValidator.equals(
    "pagination respects limit",
    paginationResult.data.length <= paginationFilter.limit,
    true,
  );
  TestValidator.equals(
    "pagination has correct limit",
    paginationResult.pagination.limit,
    paginationFilter.limit,
  );
  TestValidator.predicate(
    "pagination has current page",
    paginationResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has records count",
    paginationResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages count",
    paginationResult.pagination.pages >= 0,
  );
  // 9. Test cursor pagination
  const cursorFilter = {
    actor_type: "customer",
    limit: 5,
    cursor: "test-cursor",
  } satisfies IEcommerceMallCancellationRequestSnapshot.IRequest;
  const cursorResult =
    await api.functional.ecommerceMall.seller.cancellation_request_snapshots.index(
      sellerConnection,
      { body: cursorFilter },
    );
  typia.assert(cursorResult);
  // 10. Test empty result set with non-existent search term
  const emptyFilter = {
    actor_type: "customer",
    search: "NonExistentSearchTerm123456",
    limit: 10,
  } satisfies IEcommerceMallCancellationRequestSnapshot.IRequest;
  const emptyResult =
    await api.functional.ecommerceMall.seller.cancellation_request_snapshots.index(
      sellerConnection,
      { body: emptyFilter },
    );
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty search returns empty data",
    emptyResult.data.length,
    0,
  );
  TestValidator.equals(
    "empty search pagination has zero records",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty search pagination has zero pages",
    emptyResult.pagination.pages,
    0,
  );
  // 11. Test combined filters: response_status + date range
  const combinedFilter = {
    actor_type: "customer",
    response_status: "approved",
    approved_at_range: {
      gte: threeDaysAgo.toISOString(),
      lte: now.toISOString(),
    },
    limit: 10,
  } satisfies IEcommerceMallCancellationRequestSnapshot.IRequest;
  const combinedResult =
    await api.functional.ecommerceMall.seller.cancellation_request_snapshots.index(
      sellerConnection,
      { body: combinedFilter },
    );
  typia.assert(combinedResult);
  // Verify combined results meet both criteria
  for (const snapshot of combinedResult.data) {
    TestValidator.predicate(
      "combined: has approved_at",
      snapshot.approved_at !== undefined && snapshot.approved_at !== null,
    );
    // Verify date range (if approved_at exists, it should be within range)
    if (snapshot.approved_at) {
      TestValidator.predicate(
        "combined: approved_at within range",
        snapshot.approved_at >= threeDaysAgo.toISOString() &&
          snapshot.approved_at <= now.toISOString(),
      );
    }
  }
  // 12. Test page parameter for numeric pagination
  const pageFilter = {
    actor_type: "customer",
    page: 2,
    limit: 10,
  } satisfies IEcommerceMallCancellationRequestSnapshot.IRequest;
  const pageResult =
    await api.functional.ecommerceMall.seller.cancellation_request_snapshots.index(
      sellerConnection,
      { body: pageFilter },
    );
  typia.assert(pageResult);
  TestValidator.equals(
    "page parameter set correctly",
    pageResult.pagination.current,
    2,
  );
  TestValidator.predicate(
    "page result has valid pagination",
    pageResult.pagination.pages >= 0,
  );
}
