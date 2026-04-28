import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
import type { IEcommercePlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSeller";
import type { IEcommercePlatformSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerApprovalRequest";
import type { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommercePlatformSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformSellerApprovalRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test pagination and filtering capabilities for seller approval request listing.
 *
 * Validates the complete pagination flow including metadata calculation, page navigation, and record limiting. Tests date range filtering with created_at constraints, seller identity filtering, and status filtering. Ensures combined filters work together correctly and empty result sets are handled gracefully with proper pagination metadata.
 *
 * Special attention is given to verifying pagination metadata accuracy: current page matches request, limit constraint enforcement, and pages calculated as ceiling of total records divided by limit. Date range filtering correctly narrows results to requests within the specified timeframe.
 *
 * 1. Register and authenticate as administrator.
 * 2. Fetch baseline data with large limit to establish total record count and sample seller ID.
 * 3. Test basic pagination with page 1 and specific limit.
 * 4. Test page 2 pagination and verify record bounds.
 * 5. Filter by date range and validate results are within bounds.
 * 6. Filter by seller_id and validate all results match.
 * 7. Test combined filters with status and seller_id.
 * 8. Test empty results when filters exclude all records.
 */
export async function test_api_seller_approval_requests_pagination_and_filtering(
  connection: api.IConnection,
) {
  // 1. Admin registration and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {});
  typia.assert(adminAuth);
  // 2. Fetch baseline data with large limit
  const baselineBody = {
    limit: 100,
  } satisfies IEcommercePlatformSellerApprovalRequest.IRequest;
  const baselineResponse =
    await api.functional.ecommercePlatform.admin.seller_approval_requests.index(
      adminConnection,
      { body: baselineBody },
    );
  typia.assert(baselineResponse);
  // Validate baseline pagination metadata
  TestValidator.equals(
    "baseline current page is 1",
    baselineResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "baseline limit matches request",
    baselineResponse.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "baseline records >= 0",
    baselineResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "baseline pages calculated correctly",
    baselineResponse.pagination.records === 0
      ? baselineResponse.pagination.pages === 0
      : baselineResponse.pagination.pages ===
          Math.ceil(baselineResponse.pagination.records / 100),
  );
  TestValidator.predicate(
    "baseline data length <= limit",
    baselineResponse.data.length <= 100,
  );
  // Early return if no baseline data (empty system) - still test empty results
  if (baselineResponse.data.length === 0) {
    // Test explicit empty page request
    const emptyBody = {
      page: 1,
      limit: 10,
    } satisfies IEcommercePlatformSellerApprovalRequest.IRequest;
    const emptyResponse =
      await api.functional.ecommercePlatform.admin.seller_approval_requests.index(
        adminConnection,
        { body: emptyBody },
      );
    typia.assert(emptyResponse);
    TestValidator.equals(
      "empty result current page",
      emptyResponse.pagination.current,
      1,
    );
    TestValidator.equals(
      "empty result limit",
      emptyResponse.pagination.limit,
      10,
    );
    TestValidator.equals(
      "empty result records is 0",
      emptyResponse.pagination.records,
      0,
    );
    TestValidator.equals(
      "empty result pages is 0",
      emptyResponse.pagination.pages,
      0,
    );
    TestValidator.equals(
      "empty result data array",
      emptyResponse.data.length,
      0,
    );
    // Test future date range filter returns empty
    const futureDate = new Date(
      Date.now() + 365 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const emptyDateFilterBody = {
      created_at_gte: futureDate,
      created_at_lte: futureDate,
    } satisfies IEcommercePlatformSellerApprovalRequest.IRequest;
    const emptyDateResponse =
      await api.functional.ecommercePlatform.admin.seller_approval_requests.index(
        adminConnection,
        { body: emptyDateFilterBody },
      );
    typia.assert(emptyDateResponse);
    TestValidator.equals(
      "future date filter records is 0",
      emptyDateResponse.pagination.records,
      0,
    );
    TestValidator.equals(
      "future date filter data empty",
      emptyDateResponse.data.length,
      0,
    );
    return;
  }
  // 3. Test basic pagination with page 1
  const page1Limit = 5;
  const page1Body = {
    page: 1,
    limit: page1Limit,
  } satisfies IEcommercePlatformSellerApprovalRequest.IRequest;
  const page1Response =
    await api.functional.ecommercePlatform.admin.seller_approval_requests.index(
      adminConnection,
      { body: page1Body },
    );
  typia.assert(page1Response);
  TestValidator.equals(
    "page 1 current matches request",
    page1Response.pagination.current,
    1,
  );
  TestValidator.equals(
    "page 1 limit matches request",
    page1Response.pagination.limit,
    page1Limit,
  );
  TestValidator.equals(
    "page 1 total records matches baseline",
    page1Response.pagination.records,
    baselineResponse.pagination.records,
  );
  TestValidator.predicate(
    "page 1 pages calculated correctly",
    page1Response.pagination.pages ===
      Math.ceil(page1Response.pagination.records / page1Limit),
  );
  TestValidator.predicate(
    "page 1 data length <= limit",
    page1Response.data.length <= page1Limit,
  );
  // 4. Test page 2 pagination
  const totalPages = page1Response.pagination.pages;
  if (totalPages >= 2) {
    const page2Body = {
      page: 2,
      limit: page1Limit,
    } satisfies IEcommercePlatformSellerApprovalRequest.IRequest;
    const page2Response =
      await api.functional.ecommercePlatform.admin.seller_approval_requests.index(
        adminConnection,
        { body: page2Body },
      );
    typia.assert(page2Response);
    TestValidator.equals(
      "page 2 current matches request",
      page2Response.pagination.current,
      2,
    );
    TestValidator.equals(
      "page 2 total records same",
      page2Response.pagination.records,
      baselineResponse.pagination.records,
    );
    TestValidator.predicate(
      "page 2 data length <= limit",
      page2Response.data.length <= page1Limit,
    );
    // Verify no duplicate IDs between page 1 and page 2
    const page1Ids = new Set(page1Response.data.map((r) => r.id));
    const page2HasDuplicate = page2Response.data.some((r) =>
      page1Ids.has(r.id),
    );
    TestValidator.predicate(
      "page 2 has no duplicate IDs from page 1",
      !page2HasDuplicate,
    );
  }
  // 5. Test date range filtering
  const earliestRequest = baselineResponse.data.reduce((a, b) =>
    new Date(a.created_at).getTime() < new Date(b.created_at).getTime() ? a : b,
  );
  const latestRequest = baselineResponse.data.reduce((a, b) =>
    new Date(a.created_at).getTime() > new Date(b.created_at).getTime() ? a : b,
  );
  const dateRangeBody = {
    created_at_gte: earliestRequest.created_at,
    created_at_lte: latestRequest.created_at,
  } satisfies IEcommercePlatformSellerApprovalRequest.IRequest;
  const dateRangeResponse =
    await api.functional.ecommercePlatform.admin.seller_approval_requests.index(
      adminConnection,
      { body: dateRangeBody },
    );
  typia.assert(dateRangeResponse);
  TestValidator.predicate(
    "date range filter records >= 0",
    dateRangeResponse.pagination.records >= 0,
  );
  for (const req of dateRangeResponse.data) {
    const reqTime = new Date(req.created_at).getTime();
    const gteTime = new Date(earliestRequest.created_at).getTime();
    const lteTime = new Date(latestRequest.created_at).getTime();
    TestValidator.predicate(
      `request ${req.id} created_at within date range`,
      reqTime >= gteTime && reqTime <= lteTime,
    );
  }
  // Test with future date returns empty
  const futureDate = new Date(
    Date.now() + 365 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const futureFilterBody = {
    created_at_gte: futureDate,
  } satisfies IEcommercePlatformSellerApprovalRequest.IRequest;
  const futureFilterResponse =
    await api.functional.ecommercePlatform.admin.seller_approval_requests.index(
      adminConnection,
      { body: futureFilterBody },
    );
  typia.assert(futureFilterResponse);
  TestValidator.equals(
    "future date range returns empty",
    futureFilterResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "future date range data empty",
    futureFilterResponse.data.length,
    0,
  );
  TestValidator.equals(
    "future date range pages is 0",
    futureFilterResponse.pagination.pages,
    0,
  );
  // 6. Test seller_id filtering
  const sampleSellerId = baselineResponse.data[0].seller.id;
  const sellerFilterBody = {
    seller_id: sampleSellerId,
  } satisfies IEcommercePlatformSellerApprovalRequest.IRequest;
  const sellerFilterResponse =
    await api.functional.ecommercePlatform.admin.seller_approval_requests.index(
      adminConnection,
      { body: sellerFilterBody },
    );
  typia.assert(sellerFilterResponse);
  for (const req of sellerFilterResponse.data) {
    TestValidator.equals(
      `request ${req.id} belongs to filtered seller`,
      req.seller.id,
      sampleSellerId,
    );
  }
  // 7. Test combined filters (status + seller_id)
  const sampleStatus = baselineResponse.data[0].status;
  const combinedFilterBody = {
    status: sampleStatus,
    seller_id: sampleSellerId,
  } satisfies IEcommercePlatformSellerApprovalRequest.IRequest;
  const combinedFilterResponse =
    await api.functional.ecommercePlatform.admin.seller_approval_requests.index(
      adminConnection,
      { body: combinedFilterBody },
    );
  typia.assert(combinedFilterResponse);
  for (const req of combinedFilterResponse.data) {
    TestValidator.equals(
      `combined filter request ${req.id} has correct status`,
      req.status,
      sampleStatus,
    );
    TestValidator.equals(
      `combined filter request ${req.id} belongs to filtered seller`,
      req.seller.id,
      sampleSellerId,
    );
  }
  // 8. Test empty results with combined filters that exclude all
  const nonExistentSellerId = typia.random<string & tags.Format<"uuid">>();
  const emptyFilterBody = {
    seller_id: nonExistentSellerId,
  } satisfies IEcommercePlatformSellerApprovalRequest.IRequest;
  const emptyFilterResponse =
    await api.functional.ecommercePlatform.admin.seller_approval_requests.index(
      adminConnection,
      { body: emptyFilterBody },
    );
  typia.assert(emptyFilterResponse);
  TestValidator.equals(
    "non-existent seller filter records is 0",
    emptyFilterResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "non-existent seller filter data empty",
    emptyFilterResponse.data.length,
    0,
  );
  TestValidator.equals(
    "non-existent seller filter pages is 0",
    emptyFilterResponse.pagination.pages,
    0,
  );
}
