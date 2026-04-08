import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApprovalRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerApprovalRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_seller_approval_pending_filter_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication with connection isolation
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      display_name: RandomGenerator.name(),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdministrator.IJoin,
  });
  typia.assert(admin);
  // 2. Test pending status filter
  // Verify only pending requests are returned (no approved or rejected)
  const pendingFilter: IEcommerceMallSellerApprovalRequest.IRequest = {
    status: ["pending"],
    page: 0,
    limit: 10,
  } satisfies IEcommerceMallSellerApprovalRequest.IRequest;
  const pendingResponse: IPageIEcommerceMallSellerApprovalRequest.ISummary =
    await api.functional.ecommerceMall.administrator.seller_approvals.pending.index(
      adminConnection,
      { body: pendingFilter },
    );
  typia.assert(pendingResponse);
  // Verify response structure
  TestValidator.equals(
    "pending filter response has valid pagination",
    pendingResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pending filter response has correct limit",
    pendingResponse.pagination.limit,
    10,
  );
  // Verify each returned request is pending status
  pendingResponse.data.forEach((request) => {
    typia.assert(request);
    TestValidator.equals(
      `request ${request.id} has pending status`,
      request.status,
      "pending",
    );
    // Verify seller information is complete
    typia.assert(request.seller);
    TestValidator.predicate(
      "seller has valid id",
      request.seller.id !== null && request.seller.id !== undefined,
    );
    TestValidator.predicate(
      "seller has display name",
      request.seller.display_name !== null &&
        request.seller.display_name !== undefined,
    );
    // Verify reviewer is null for pending requests
    TestValidator.equals(
      `request ${request.id} has null reviewer`,
      request.reviewer,
      undefined,
    );
    TestValidator.equals(
      `request ${request.id} has null rejection reason`,
      request.rejection_reason,
      undefined,
    );
  });
  // 3. Test search functionality with partial email match
  const searchEmail: IEcommerceMallSellerApprovalRequest.IRequest = {
    status: ["pending"],
    search: "test",
    page: 0,
    limit: 10,
  } satisfies IEcommerceMallSellerApprovalRequest.IRequest;
  const searchResponse: IPageIEcommerceMallSellerApprovalRequest.ISummary =
    await api.functional.ecommerceMall.administrator.seller_approvals.pending.index(
      adminConnection,
      { body: searchEmail },
    );
  typia.assert(searchResponse);
  // Verify search returns paginated results
  TestValidator.equals(
    "search response has valid pagination",
    searchResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "search response limit matches request",
    searchResponse.pagination.limit,
    10,
  );
  // Verify all search results match search criteria
  searchResponse.data.forEach((request) => {
    typia.assert(request);
    typia.assert(request.seller);
    const sellerEmail = request.seller.email ?? "";
    const sellerDisplayName = request.seller.display_name;
    const searchLower = "test".toLowerCase();
    // Search should match email (case-insensitive) or display name
    const emailMatch = sellerEmail.toLowerCase().includes(searchLower);
    const nameMatch = sellerDisplayName.toLowerCase().includes(searchLower);
    TestValidator.predicate(
      "search result matches email or display name",
      emailMatch || nameMatch,
    );
  });
  // 4. Test date range filtering
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const dateRangeFilter: IEcommerceMallSellerApprovalRequest.IRequest = {
    status: ["pending"],
    created_at_gte: yesterday.toISOString(),
    created_at_lte: now.toISOString(),
    page: 0,
    limit: 10,
  } satisfies IEcommerceMallSellerApprovalRequest.IRequest;
  const dateResponse: IPageIEcommerceMallSellerApprovalRequest.ISummary =
    await api.functional.ecommerceMall.administrator.seller_approvals.pending.index(
      adminConnection,
      { body: dateRangeFilter },
    );
  typia.assert(dateResponse);
  // Verify date range filter returns valid results
  TestValidator.equals(
    "date range response has valid pagination",
    dateResponse.pagination.current,
    1,
  );
  // Verify all returned requests fall within date range
  dateResponse.data.forEach((request) => {
    typia.assert(request);
    const createdAt = new Date(request.created_at);
    const gte = new Date(yesterday.toISOString());
    const lte = new Date(now.toISOString());
    TestValidator.predicate(
      "request created_at >= created_at_gte",
      createdAt.getTime() >= gte.getTime(),
    );
    TestValidator.predicate(
      "request created_at <= created_at_lte",
      createdAt.getTime() <= lte.getTime(),
    );
  });
  // 5. Test combined filters (status + search + date range)
  const combinedFilter: IEcommerceMallSellerApprovalRequest.IRequest = {
    status: ["pending"],
    search: "test",
    created_at_gte: yesterday.toISOString(),
    created_at_lte: now.toISOString(),
    page: 0,
    limit: 10,
  } satisfies IEcommerceMallSellerApprovalRequest.IRequest;
  const combinedResponse: IPageIEcommerceMallSellerApprovalRequest.ISummary =
    await api.functional.ecommerceMall.administrator.seller_approvals.pending.index(
      adminConnection,
      { body: combinedFilter },
    );
  typia.assert(combinedResponse);
  // Verify combined filters return results
  TestValidator.equals(
    "combined filters response has valid pagination",
    combinedResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "combined filters response has correct limit",
    combinedResponse.pagination.limit,
    10,
  );
  // Verify all results match all filter criteria
  combinedResponse.data.forEach((request) => {
    typia.assert(request);
    typia.assert(request.seller);
    const createdAt = new Date(request.created_at);
    const gte = new Date(yesterday.toISOString());
    const lte = new Date(now.toISOString());
    const searchLower = "test".toLowerCase();
    // Status filter
    TestValidator.equals(
      `request ${request.id} status is pending`,
      request.status,
      "pending",
    );
    // Search filter
    const sellerEmail = request.seller.email ?? "";
    const sellerDisplayName = request.seller.display_name;
    const emailMatch = sellerEmail.toLowerCase().includes(searchLower);
    const nameMatch = sellerDisplayName.toLowerCase().includes(searchLower);
    TestValidator.predicate(
      `request ${request.id} matches search criteria`,
      emailMatch || nameMatch,
    );
    // Date range filter
    TestValidator.predicate(
      `request ${request.id} created_at >= gte`,
      createdAt.getTime() >= gte.getTime(),
    );
    TestValidator.predicate(
      `request ${request.id} created_at <= lte`,
      createdAt.getTime() <= lte.getTime(),
    );
  });
  // 6. Test pagination metadata accuracy
  // Verify records count matches actual data length
  TestValidator.equals(
    "pagination records count matches data length",
    pendingResponse.pagination.records,
    pendingResponse.data.length,
  );
  // Verify total pages is calculated correctly
  const expectedPages = Math.ceil(
    pendingResponse.pagination.records / pendingResponse.pagination.limit,
  );
  TestValidator.equals(
    "pagination pages calculated correctly",
    pendingResponse.pagination.pages,
    expectedPages,
  );
  // 7. Verify seller information completeness in join
  pendingResponse.data.forEach((request) => {
    typia.assert(request);
    typia.assert(request.seller);
    // Verify all seller summary fields are present
    TestValidator.predicate(
      "seller has id",
      request.seller.id !== null && request.seller.id !== undefined,
    );
    TestValidator.equals(
      "seller has display name",
      typeof request.seller.display_name,
      "string",
    );
    TestValidator.equals(
      "seller has approval status",
      typeof request.seller.approval_status,
      "string",
    );
    TestValidator.equals(
      "seller has is_suspended boolean",
      typeof request.seller.is_suspended,
      "boolean",
    );
    TestValidator.equals(
      "seller has created_at timestamp",
      typeof request.seller.created_at,
      "string",
    );
  });
}
