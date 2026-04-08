import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test filtering sellers by approval status for administrator review.
 *
 * Validates that administrators can filter the seller list by approval status
 * to efficiently locate seller applications awaiting review. The endpoint
 * supports filtering by 'pending', 'approved', and 'rejected' status values,
 * allowing administrators to focus on specific groups of sellers.
 *
 * The test verifies:
 * - Filtering by 'pending' status returns only pending sellers
 * - Filtering by 'approved' status returns only approved sellers
 * - Filtering by 'rejected' status returns only rejected sellers
 * - Combining status filter with date range filters works correctly
 * - Pagination metadata accurately reflects filtered results
 *
 * 1. Authenticate as administrator using authorize_admin_join
 * 2. Filter sellers by 'pending' status and validate results
 * 3. Filter sellers by 'approved' status and validate results
 * 4. Filter sellers by 'rejected' status and validate results
 * 5. Combine status filter with dateFrom/dateTo for precise filtering
 * 6. Verify pagination metadata accuracy
 */
export async function test_api_seller_filtering_by_approval_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Test filtering by 'pending' status
  const pendingResult =
    await api.functional.ecommerceMall.admin.admin.sellers.index(
      adminConnection,
      {
        body: {
          status: "pending",
          limit: 100,
        } satisfies IEcommerceMallSeller.IRequest,
      },
    );
  typia.assert(pendingResult);
  // Validate all returned sellers have pending status
  for (const seller of pendingResult.data) {
    TestValidator.equals(
      "seller approval status is pending",
      seller.approvalStatus,
      "pending",
    );
  }
  // 3. Test filtering by 'approved' status
  const approvedResult =
    await api.functional.ecommerceMall.admin.admin.sellers.index(
      adminConnection,
      {
        body: {
          status: "approved",
          limit: 100,
        } satisfies IEcommerceMallSeller.IRequest,
      },
    );
  typia.assert(approvedResult);
  // Validate all returned sellers have approved status
  for (const seller of approvedResult.data) {
    TestValidator.equals(
      "seller approval status is approved",
      seller.approvalStatus,
      "approved",
    );
  }
  // 4. Test filtering by 'rejected' status
  const rejectedResult =
    await api.functional.ecommerceMall.admin.admin.sellers.index(
      adminConnection,
      {
        body: {
          status: "rejected",
          limit: 100,
        } satisfies IEcommerceMallSeller.IRequest,
      },
    );
  typia.assert(rejectedResult);
  // Validate all returned sellers have rejected status
  for (const seller of rejectedResult.data) {
    TestValidator.equals(
      "seller approval status is rejected",
      seller.approvalStatus,
      "rejected",
    );
  }
  // 5. Combine status filter with date range
  const now = new Date();
  const oneYearAgo = new Date(
    now.getFullYear() - 1,
    now.getMonth(),
    now.getDate(),
  );
  const filteredByDateAndStatus =
    await api.functional.ecommerceMall.admin.admin.sellers.index(
      adminConnection,
      {
        body: {
          status: "pending",
          dateFrom: oneYearAgo.toISOString(),
          dateTo: now.toISOString(),
          limit: 100,
        } satisfies IEcommerceMallSeller.IRequest,
      },
    );
  typia.assert(filteredByDateAndStatus);
  // Validate date filtering works correctly for pending sellers
  for (const seller of filteredByDateAndStatus.data) {
    TestValidator.equals(
      "seller approval status is pending",
      seller.approvalStatus,
      "pending",
    );
    const createdAt = new Date(seller.createdAt);
    TestValidator.predicate(
      "seller created within date range",
      createdAt >= oneYearAgo && createdAt <= now,
    );
  }
  // 6. Validate pagination metadata
  TestValidator.predicate(
    "pagination records is non-negative",
    pendingResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination current page is valid",
    pendingResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    pendingResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    pendingResult.pagination.pages >= 0,
  );
}
