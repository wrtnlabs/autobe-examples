import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundRequestSnapshot";
import type { IShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test refund request snapshot filtering by status transitions and other criteria.
 *
 * Validates that sellers can filter refund request snapshots by status transitions (approved/rejected), date ranges, and response text. Ensures proper filtering logic with AND combination of multiple filters and correct pagination.
 *
 * 1. Register and authenticate as a seller
 * 2. Query snapshots with status_after='approved' filter
 * 3. Query snapshots with status_after='rejected' filter
 * 4. Test date range filtering with created_at_from and created_at_to
 * 5. Test response_text search filtering
 * 6. Verify pagination works with filtered results
 * 7. Test combined filters with AND logic
 * 8. Validate empty results when no matching snapshots exist
 */
export async function test_api_refund_request_snapshot_filter_by_status_transition(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(seller);
  // 2. Test filtering by status_after='approved'
  const approvedFilterResult =
    await api.functional.shoppingMall.seller.refund_requests.snapshots.index(
      sellerConnection,
      {
        body: {
          status_after: "approved",
          page: 1,
          limit: 100,
        } satisfies IShoppingMallRefundRequestSnapshot.IRequest,
      },
    );
  typia.assert(approvedFilterResult);
  // Verify all returned snapshots have correct status transition
  for (const snapshot of approvedFilterResult.data) {
    TestValidator.equals(
      "status_before is pending for approved",
      snapshot.status_before,
      "pending",
    );
    TestValidator.equals(
      "status_after is approved",
      snapshot.status_after,
      "approved",
    );
    TestValidator.equals(
      "seller matches authenticated seller",
      snapshot.seller.id,
      seller.id,
    );
  }
  // 3. Test filtering by status_after='rejected'
  const rejectedFilterResult =
    await api.functional.shoppingMall.seller.refund_requests.snapshots.index(
      sellerConnection,
      {
        body: {
          status_after: "rejected",
          page: 1,
          limit: 100,
        } satisfies IShoppingMallRefundRequestSnapshot.IRequest,
      },
    );
  typia.assert(rejectedFilterResult);
  // Verify all returned snapshots are rejected and have response_text
  for (const snapshot of rejectedFilterResult.data) {
    TestValidator.equals(
      "status_before is pending for rejected",
      snapshot.status_before,
      "pending",
    );
    TestValidator.equals(
      "status_after is rejected",
      snapshot.status_after,
      "rejected",
    );
    TestValidator.predicate(
      "rejected snapshots have response_text",
      snapshot.response_text !== null,
    );
  }
  // 4. Test date range filtering
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  const twoHoursAgo = new Date(
    now.getTime() - 2 * 60 * 60 * 1000,
  ).toISOString();
  const dateRangeFilterResult =
    await api.functional.shoppingMall.seller.refund_requests.snapshots.index(
      sellerConnection,
      {
        body: {
          created_at_from: oneHourAgo,
          created_at_to: now.toISOString(),
          page: 1,
          limit: 100,
        } satisfies IShoppingMallRefundRequestSnapshot.IRequest,
      },
    );
  typia.assert(dateRangeFilterResult);
  // Verify all returned snapshots are within the date range
  for (const snapshot of dateRangeFilterResult.data) {
    TestValidator.predicate(
      "snapshot created_at is within range",
      snapshot.created_at >= oneHourAgo &&
        snapshot.created_at <= now.toISOString(),
    );
  }
  // Test empty date range (should return no results)
  const emptyDateRangeResult =
    await api.functional.shoppingMall.seller.refund_requests.snapshots.index(
      sellerConnection,
      {
        body: {
          created_at_from: twoHoursAgo,
          created_at_to: oneHourAgo,
          page: 1,
          limit: 100,
        } satisfies IShoppingMallRefundRequestSnapshot.IRequest,
      },
    );
  typia.assert(emptyDateRangeResult);
  TestValidator.equals(
    "empty date range returns no results",
    emptyDateRangeResult.data.length,
    0,
  );
  // 5. Test response_text search filtering
  const searchTextFilterResult =
    await api.functional.shoppingMall.seller.refund_requests.snapshots.index(
      sellerConnection,
      {
        body: {
          response_text: "refund",
          page: 1,
          limit: 100,
        } satisfies IShoppingMallRefundRequestSnapshot.IRequest,
      },
    );
  typia.assert(searchTextFilterResult);
  // Verify all found snapshots have the search text in response_text
  for (const snapshot of searchTextFilterResult.data) {
    TestValidator.predicate(
      "response_text contains search term",
      snapshot.response_text !== null &&
        snapshot.response_text.toLowerCase().includes("refund"),
    );
  }
  // Test response_text=null filter
  const nullResponseFilterResult =
    await api.functional.shoppingMall.seller.refund_requests.snapshots.index(
      sellerConnection,
      {
        body: {
          response_text: null,
          page: 1,
          limit: 100,
        } satisfies IShoppingMallRefundRequestSnapshot.IRequest,
      },
    );
  typia.assert(nullResponseFilterResult);
  // Verify all returned snapshots have null response_text
  for (const snapshot of nullResponseFilterResult.data) {
    TestValidator.equals("response_text is null", snapshot.response_text, null);
  }
  // 6. Test combined filters (AND logic)
  const combinedFilterResult =
    await api.functional.shoppingMall.seller.refund_requests.snapshots.index(
      sellerConnection,
      {
        body: {
          status_after: "rejected",
          created_at_from: oneHourAgo,
          page: 1,
          limit: 100,
        } satisfies IShoppingMallRefundRequestSnapshot.IRequest,
      },
    );
  typia.assert(combinedFilterResult);
  // Verify all snapshots match both filters
  for (const snapshot of combinedFilterResult.data) {
    TestValidator.equals(
      "status_after is rejected",
      snapshot.status_after,
      "rejected",
    );
    TestValidator.predicate(
      "created_at is within date range",
      snapshot.created_at >= oneHourAgo,
    );
    TestValidator.predicate(
      "rejected snapshots have response_text",
      snapshot.response_text !== null,
    );
  }
  // 7. Test pagination with filtered results
  const paginationFilterResult =
    await api.functional.shoppingMall.seller.refund_requests.snapshots.index(
      sellerConnection,
      {
        body: {
          status_after: "approved",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallRefundRequestSnapshot.IRequest,
      },
    );
  typia.assert(paginationFilterResult);
  TestValidator.equals(
    "pagination limit respected",
    paginationFilterResult.data.length,
    Math.min(paginationFilterResult.pagination.records, 10),
  );
  TestValidator.equals(
    "pagination current page",
    paginationFilterResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    paginationFilterResult.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination pages calculated correctly",
    paginationFilterResult.pagination.pages >= 0,
  );
  // 8. Test empty results when no matching snapshots exist
  const nonExistentFilterResult =
    await api.functional.shoppingMall.seller.refund_requests.snapshots.index(
      sellerConnection,
      {
        body: {
          status_after: "nonexistent_status",
          page: 1,
          limit: 100,
        } satisfies IShoppingMallRefundRequestSnapshot.IRequest,
      },
    );
  typia.assert(nonExistentFilterResult);
  TestValidator.equals(
    "non-existent status returns empty",
    nonExistentFilterResult.data.length,
    0,
  );
  TestValidator.equals(
    "non-existent status pagination records",
    nonExistentFilterResult.pagination.records,
    0,
  );
  // 9. Test filtering by seller_id (should only return own snapshots)
  const sellerIdFilterResult =
    await api.functional.shoppingMall.seller.refund_requests.snapshots.index(
      sellerConnection,
      {
        body: {
          seller_id: seller.id,
          page: 1,
          limit: 100,
        } satisfies IShoppingMallRefundRequestSnapshot.IRequest,
      },
    );
  typia.assert(sellerIdFilterResult);
  // Verify all returned snapshots belong to the authenticated seller
  for (const snapshot of sellerIdFilterResult.data) {
    TestValidator.equals(
      "seller_id matches authenticated seller",
      snapshot.seller.id,
      seller.id,
    );
  }
  // 10. Test filtering by refund_request_id
  if (approvedFilterResult.data.length > 0) {
    const specificRefundRequestId =
      approvedFilterResult.data[0].refund_request_id;
    const refundRequestIdFilterResult =
      await api.functional.shoppingMall.seller.refund_requests.snapshots.index(
        sellerConnection,
        {
          body: {
            refund_request_id: specificRefundRequestId,
            page: 1,
            limit: 100,
          } satisfies IShoppingMallRefundRequestSnapshot.IRequest,
        },
      );
    typia.assert(refundRequestIdFilterResult);
    // Verify all returned snapshots have the same refund_request_id
    for (const snapshot of refundRequestIdFilterResult.data) {
      TestValidator.equals(
        "refund_request_id matches filter",
        snapshot.refund_request_id,
        specificRefundRequestId,
      );
    }
  }
}
