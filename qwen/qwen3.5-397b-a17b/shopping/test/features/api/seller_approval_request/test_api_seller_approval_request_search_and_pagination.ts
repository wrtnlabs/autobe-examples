import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerApprovalRequest";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApprovalRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test seller approval request search and pagination functionality.
 *
 * Validates the complete search and pagination workflow for administrator managing seller approval requests. Tests email-based search with case-insensitive partial matching, pagination with correct metadata calculation, date range filtering with inclusive bounds, and combined filter operations.
 *
 * Special attention is given to verifying that search returns only matching sellers, pagination metadata accurately reflects total records and pages, and multiple filters work together correctly without conflicts.
 *
 * 1. Administrator creates account and authenticates.
 * 2. Creates 12 seller accounts with distinct email patterns for search testing.
 * 3. Tests search with partial email match (e.g., "seller0" matches test.seller0@*).
 * 4. Validates case-insensitive search by using uppercase search term.
 * 5. Tests pagination with page=1, limit=5 returns correct subset.
 * 6. Verifies pagination metadata (current, limit, records, pages) is accurate.
 * 7. Tests page=2 to verify second page returns remaining items.
 * 8. Tests date range filtering with created_at_from and created_at_to.
 * 9. Validates combined filters (status + search + date range + pagination).
 * 10. Tests non-matching search returns empty data array.
 */
export async function test_api_seller_approval_request_search_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup - create admin account and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "TestPass123!",
    grade: "super" as const,
  } satisfies IShoppingMallAdmin.IJoin;
  await authorize_admin_join(adminConnection, { body: adminCredentials });
  // 2. Create multiple seller accounts with different email patterns for search testing
  const sellerEmails: string[] = [];
  // Create 8 sellers with varying email patterns
  for (let i = 0; i < 8; i++) {
    const sellerConnection: api.IConnection = { host: connection.host };
    const email = `test.seller${i}@example.com`;
    sellerEmails.push(email);
    const sellerCredentials = {
      email: email,
      password: "SellerPass123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin;
    await authorize_seller_join(sellerConnection, { body: sellerCredentials });
  }
  // Wait a moment to ensure different timestamps for date range testing
  await new Promise((resolve) => setTimeout(resolve, 100));
  const middleTimestamp = new Date().toISOString();
  await new Promise((resolve) => setTimeout(resolve, 100));
  // Create 4 more sellers after the timestamp
  for (let i = 8; i < 12; i++) {
    const sellerConnection: api.IConnection = { host: connection.host };
    const email = `test.seller${i}@example.com`;
    sellerEmails.push(email);
    const sellerCredentials = {
      email: email,
      password: "SellerPass123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin;
    await authorize_seller_join(sellerConnection, { body: sellerCredentials });
  }
  // 3. Test search with partial email match - search for "seller0"
  const searchResult0 =
    await api.functional.shoppingMall.seller.approval_requests.index(
      adminConnection,
      {
        body: {
          search: "seller0",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallSellerApprovalRequest.IRequest,
      },
    );
  typia.assert(searchResult0);
  // Verify search results contain only sellers with "seller0" in email
  TestValidator.predicate(
    "search results contain only matching emails",
    searchResult0.data.every((req) =>
      req.seller.email.toLowerCase().includes("seller0"),
    ),
  );
  // 4. Test case-insensitive search - search with uppercase "SELLER1"
  const searchResultUppercase =
    await api.functional.shoppingMall.seller.approval_requests.index(
      adminConnection,
      {
        body: {
          search: "SELLER1",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallSellerApprovalRequest.IRequest,
      },
    );
  typia.assert(searchResultUppercase);
  // Verify case-insensitive matching works
  TestValidator.predicate(
    "search is case-insensitive",
    searchResultUppercase.data.every((req) =>
      req.seller.email.toLowerCase().includes("seller1"),
    ),
  );
  // 5. Test search with different substring - search for "example"
  const searchResultExample =
    await api.functional.shoppingMall.seller.approval_requests.index(
      adminConnection,
      {
        body: {
          search: "example",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallSellerApprovalRequest.IRequest,
      },
    );
  typia.assert(searchResultExample);
  // Verify all results contain "example" in email
  TestValidator.predicate(
    "all results contain example in email",
    searchResultExample.data.every((req) =>
      req.seller.email.toLowerCase().includes("example"),
    ),
  );
  // 6. Test non-matching search returns empty results
  const searchResultNoMatch =
    await api.functional.shoppingMall.seller.approval_requests.index(
      adminConnection,
      {
        body: {
          search: "nonexistent_email_xyz",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallSellerApprovalRequest.IRequest,
      },
    );
  typia.assert(searchResultNoMatch);
  TestValidator.equals(
    "non-matching search returns empty data",
    searchResultNoMatch.data.length,
    0,
  );
  // 7. Test pagination with page=1, limit=5
  const page1Result =
    await api.functional.shoppingMall.seller.approval_requests.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 5,
        } satisfies IShoppingMallSellerApprovalRequest.IRequest,
      },
    );
  typia.assert(page1Result);
  // Verify page 1 returns at most 5 items
  TestValidator.predicate(
    "page 1 returns at most 5 items",
    page1Result.data.length <= 5,
  );
  // Verify pagination metadata
  TestValidator.equals(
    "page 1 current page",
    page1Result.pagination.current,
    1,
  );
  TestValidator.equals("page 1 limit", page1Result.pagination.limit, 5);
  TestValidator.predicate(
    "page 1 records >= data length",
    page1Result.pagination.records >= page1Result.data.length,
  );
  // 8. Test page=2 with same limit
  const page2Result =
    await api.functional.shoppingMall.seller.approval_requests.index(
      adminConnection,
      {
        body: {
          page: 2,
          limit: 5,
        } satisfies IShoppingMallSellerApprovalRequest.IRequest,
      },
    );
  typia.assert(page2Result);
  // Verify page 2 current page is 2
  TestValidator.equals(
    "page 2 current page",
    page2Result.pagination.current,
    2,
  );
  // Verify pages are calculated correctly
  const expectedPages = Math.ceil(
    page1Result.pagination.records / page1Result.pagination.limit,
  );
  TestValidator.equals(
    "total pages calculated correctly",
    page1Result.pagination.pages,
    expectedPages,
  );
  // 9. Test date range filtering with created_at_to
  const dateRangeToResult =
    await api.functional.shoppingMall.seller.approval_requests.index(
      adminConnection,
      {
        body: {
          created_at_to: middleTimestamp,
          page: 1,
          limit: 20,
        } satisfies IShoppingMallSellerApprovalRequest.IRequest,
      },
    );
  typia.assert(dateRangeToResult);
  // Verify all results are within date range (created_at <= middleTimestamp)
  TestValidator.predicate(
    "all results created before or at middle timestamp",
    dateRangeToResult.data.every(
      (req) => new Date(req.createdAt) <= new Date(middleTimestamp),
    ),
  );
  // 10. Test date range filtering with created_at_from
  const dateRangeFromResult =
    await api.functional.shoppingMall.seller.approval_requests.index(
      adminConnection,
      {
        body: {
          created_at_from: middleTimestamp,
          page: 1,
          limit: 20,
        } satisfies IShoppingMallSellerApprovalRequest.IRequest,
      },
    );
  typia.assert(dateRangeFromResult);
  // Verify all results are after or at middleTimestamp
  TestValidator.predicate(
    "all results created at or after middle timestamp",
    dateRangeFromResult.data.every(
      (req) => new Date(req.createdAt) >= new Date(middleTimestamp),
    ),
  );
  // 11. Test combined filters: status=pending + search + date range + pagination
  const combinedResult =
    await api.functional.shoppingMall.seller.approval_requests.index(
      adminConnection,
      {
        body: {
          status: "pending",
          search: "test",
          created_at_from: new Date(
            Date.now() - 1000 * 60 * 60 * 24,
          ).toISOString(),
          page: 1,
          limit: 10,
        } satisfies IShoppingMallSellerApprovalRequest.IRequest,
      },
    );
  typia.assert(combinedResult);
  // Verify combined filter results
  TestValidator.predicate(
    "combined filter: all results have pending status",
    combinedResult.data.every((req) => req.status === "pending"),
  );
  TestValidator.predicate(
    "combined filter: all results match search term",
    combinedResult.data.every((req) =>
      req.seller.email.toLowerCase().includes("test"),
    ),
  );
  // 12. Verify default sorting is by createdAt descending
  if (page1Result.data.length > 1) {
    TestValidator.predicate(
      "results sorted by createdAt descending",
      page1Result.data.every((req, index, arr) => {
        if (index === 0) return true;
        return (
          new Date(arr[index - 1].createdAt).getTime() >=
          new Date(req.createdAt).getTime()
        );
      }),
    );
  }
  // 13. Test limit constraint - verify limit=100 is accepted
  const maxLimitResult =
    await api.functional.shoppingMall.seller.approval_requests.index(
      adminConnection,
      {
        body: {
          limit: 100,
          page: 1,
        } satisfies IShoppingMallSellerApprovalRequest.IRequest,
      },
    );
  typia.assert(maxLimitResult);
  TestValidator.equals(
    "max limit accepted",
    maxLimitResult.pagination.limit,
    100,
  );
}
