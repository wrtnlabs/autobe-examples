import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundRequestSnapshot";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test filtering refund request snapshots by various criteria for administrative oversight and dispute resolution.
 *
 * Validates the complete refund request snapshot filtering functionality including status transitions, seller filtering, date range queries, and response text search. Ensures that administrators can effectively audit refund request decisions and track the complete lifecycle of refund requests through their status transitions.
 *
 * Special attention is given to verifying that filters work correctly individually and in combination, pagination metadata is accurate for filtered results, and the response structure contains all required fields for dispute resolution.
 *
 * 1. Administrator registers and authenticates to access refund request snapshots.
 * 2. Test filtering by status_after='approved' to retrieve only approved refund snapshots.
 * 3. Test filtering by status_after='rejected' to retrieve only rejected refund snapshots.
 * 4. Test filtering by status_before='pending' and status_after='approved' for specific state transition.
 * 5. Test filtering by seller_id to see snapshots for a specific seller's responses.
 * 6. Test filtering by created_at_from and created_at_to for date range queries.
 * 7. Test filtering by response_text to search for specific keywords in seller responses.
 * 8. Test pagination with custom page and limit parameters.
 * 9. Test combining multiple filters together (status, seller, date range).
 * 10. Validate that empty results return valid pagination with records=0, pages=0, data=[].
 * 11. Validate that all returned snapshots have valid structure and correct filter matching.
 */
export async function test_api_refund_request_snapshots_filter_by_status_and_date(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  // 2. Test filtering by status_after='approved'
  const approvedFilter = {
    status_after: "approved",
    page: 1,
    limit: 20,
  } satisfies IShoppingMallRefundRequestSnapshot.IRequest;
  const approvedSnapshots =
    await api.functional.shoppingMall.administrator.refund_requests.snapshots.index(
      adminConnection,
      { body: approvedFilter },
    );
  typia.assert(approvedSnapshots);
  TestValidator.equals(
    "all approved snapshots have status_after='approved'",
    approvedSnapshots.data.every((s) => s.status_after === "approved"),
    true,
  );
  // 3. Test filtering by status_after='rejected'
  const rejectedFilter = {
    status_after: "rejected",
    page: 1,
    limit: 20,
  } satisfies IShoppingMallRefundRequestSnapshot.IRequest;
  const rejectedSnapshots =
    await api.functional.shoppingMall.administrator.refund_requests.snapshots.index(
      adminConnection,
      { body: rejectedFilter },
    );
  typia.assert(rejectedSnapshots);
  TestValidator.equals(
    "all rejected snapshots have status_after='rejected'",
    rejectedSnapshots.data.every((s) => s.status_after === "rejected"),
    true,
  );
  // 4. Test filtering by status_before='pending' and status_after='approved'
  const transitionFilter = {
    status_before: "pending",
    status_after: "approved",
    page: 1,
    limit: 20,
  } satisfies IShoppingMallRefundRequestSnapshot.IRequest;
  const transitionSnapshots =
    await api.functional.shoppingMall.administrator.refund_requests.snapshots.index(
      adminConnection,
      { body: transitionFilter },
    );
  typia.assert(transitionSnapshots);
  TestValidator.equals(
    "all transition snapshots match status_before='pending' and status_after='approved'",
    transitionSnapshots.data.every(
      (s) => s.status_before === "pending" && s.status_after === "approved",
    ),
    true,
  );
  // 5. Test filtering by seller_id
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  const sellerFilter = {
    seller_id: sellerId,
    page: 1,
    limit: 20,
  } satisfies IShoppingMallRefundRequestSnapshot.IRequest;
  const sellerSnapshots =
    await api.functional.shoppingMall.administrator.refund_requests.snapshots.index(
      adminConnection,
      { body: sellerFilter },
    );
  typia.assert(sellerSnapshots);
  TestValidator.equals(
    "all seller snapshots belong to specified seller_id",
    sellerSnapshots.data.every((s) => s.seller.id === sellerId),
    true,
  );
  // 6. Test filtering by created_at date range
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const dateRangeFilter = {
    created_at_from: thirtyDaysAgo.toISOString(),
    created_at_to: now.toISOString(),
    page: 1,
    limit: 20,
  } satisfies IShoppingMallRefundRequestSnapshot.IRequest;
  const dateRangeSnapshots =
    await api.functional.shoppingMall.administrator.refund_requests.snapshots.index(
      adminConnection,
      { body: dateRangeFilter },
    );
  typia.assert(dateRangeSnapshots);
  TestValidator.equals(
    "all date range snapshots are within specified range",
    dateRangeSnapshots.data.every(
      (s) =>
        new Date(s.created_at) >= thirtyDaysAgo &&
        new Date(s.created_at) <= now,
    ),
    true,
  );
  // 7. Test filtering by response_text (case-insensitive search)
  const searchText = "refund";
  const textFilter = {
    response_text: searchText,
    page: 1,
    limit: 20,
  } satisfies IShoppingMallRefundRequestSnapshot.IRequest;
  const textSnapshots =
    await api.functional.shoppingMall.administrator.refund_requests.snapshots.index(
      adminConnection,
      { body: textFilter },
    );
  typia.assert(textSnapshots);
  TestValidator.equals(
    "all text search snapshots contain search keyword in response_text",
    textSnapshots.data.every(
      (s) =>
        s.response_text !== null &&
        s.response_text.toLowerCase().includes(searchText.toLowerCase()),
    ),
    true,
  );
  // 8. Test pagination with custom page and limit
  const paginationFilter = {
    page: 2,
    limit: 10,
  } satisfies IShoppingMallRefundRequestSnapshot.IRequest;
  const paginationSnapshots =
    await api.functional.shoppingMall.administrator.refund_requests.snapshots.index(
      adminConnection,
      { body: paginationFilter },
    );
  typia.assert(paginationSnapshots);
  TestValidator.equals(
    "pagination current page matches request",
    paginationSnapshots.pagination.current,
    2,
  );
  TestValidator.equals(
    "pagination limit matches request",
    paginationSnapshots.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination data length does not exceed limit",
    paginationSnapshots.data.length <= 10,
  );
  // 9. Test combining multiple filters (status, seller, date range)
  const combinedFilter = {
    status_after: "approved",
    seller_id: sellerId,
    created_at_from: thirtyDaysAgo.toISOString(),
    created_at_to: now.toISOString(),
    page: 1,
    limit: 20,
  } satisfies IShoppingMallRefundRequestSnapshot.IRequest;
  const combinedSnapshots =
    await api.functional.shoppingMall.administrator.refund_requests.snapshots.index(
      adminConnection,
      { body: combinedFilter },
    );
  typia.assert(combinedSnapshots);
  TestValidator.equals(
    "all combined filter snapshots match all criteria",
    combinedSnapshots.data.every(
      (s) =>
        s.status_after === "approved" &&
        s.seller.id === sellerId &&
        new Date(s.created_at) >= thirtyDaysAgo &&
        new Date(s.created_at) <= now,
    ),
    true,
  );
  // 10. Test empty results with non-existent seller_id
  const nonExistentSellerId = typia.random<string & tags.Format<"uuid">>();
  const emptyFilter = {
    seller_id: nonExistentSellerId,
    page: 1,
    limit: 20,
  } satisfies IShoppingMallRefundRequestSnapshot.IRequest;
  const emptySnapshots =
    await api.functional.shoppingMall.administrator.refund_requests.snapshots.index(
      adminConnection,
      { body: emptyFilter },
    );
  typia.assert(emptySnapshots);
  TestValidator.equals(
    "empty results have records=0",
    emptySnapshots.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty results have pages=0",
    emptySnapshots.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty results have empty data array",
    emptySnapshots.data.length,
    0,
  );
  // 11. Validate snapshot structure for all results
  const allSnapshots = [
    ...approvedSnapshots.data,
    ...rejectedSnapshots.data,
    ...transitionSnapshots.data,
    ...sellerSnapshots.data,
    ...dateRangeSnapshots.data,
    ...textSnapshots.data,
    ...paginationSnapshots.data,
    ...combinedSnapshots.data,
  ];
  TestValidator.predicate(
    "all snapshots have valid structure with required fields",
    allSnapshots.every(
      (s) =>
        typeof s.id === "string" &&
        typeof s.refund_request_id === "string" &&
        typeof s.seller.id === "string" &&
        typeof s.status_before === "string" &&
        typeof s.status_after === "string" &&
        (s.response_text === null || typeof s.response_text === "string") &&
        typeof s.created_at === "string",
    ),
  );
}
