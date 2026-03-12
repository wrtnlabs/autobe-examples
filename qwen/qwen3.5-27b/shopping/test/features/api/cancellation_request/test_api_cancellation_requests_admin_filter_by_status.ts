import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationRequest";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test admin filtering of cancellation requests by status.
 *
 * This test validates that an authenticated admin can filter cancellation
 * requests by status (pending, approved, rejected) to view specific subsets
 * of requests. The test verifies that pagination metadata reflects the
 * filtered result set and that response fields are correctly populated
 * based on status.
 */
export async function test_api_cancellation_requests_admin_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
      href: "https://example.com/admin/join",
      referrer: "https://example.com/admin",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Test filtering by status='pending'
  const pendingResult =
    await api.functional.shoppingMall.admin.cancellationRequests.index(
      adminConnection,
      {
        body: {
          status: "pending",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(pendingResult);
  // Verify pagination reflects filtered results
  TestValidator.predicate(
    "pending filter returns valid pagination",
    pendingResult.pagination.records >= 0,
  );
  TestValidator.equals(
    "pending filter page limit",
    pendingResult.pagination.limit,
    20,
  );
  // Verify all returned requests have status='pending'
  for (const request of pendingResult.data) {
    TestValidator.equals(
      `request ${request.id} has status pending`,
      request.status,
      "pending",
    );
    TestValidator.equals(
      `request ${request.id} respondedAt is null when pending`,
      request.respondedAt,
      null,
    );
    TestValidator.equals(
      `request ${request.id} rejectionReason is null when pending`,
      request.rejectionReason,
      null,
    );
  }
  // 3. Test filtering by status='approved'
  const approvedResult =
    await api.functional.shoppingMall.admin.cancellationRequests.index(
      adminConnection,
      {
        body: {
          status: "approved",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(approvedResult);
  // Verify pagination reflects filtered results
  TestValidator.predicate(
    "approved filter returns valid pagination",
    approvedResult.pagination.records >= 0,
  );
  // Verify all returned requests have status='approved' and respondedAt populated
  for (const request of approvedResult.data) {
    TestValidator.equals(
      `request ${request.id} has status approved`,
      request.status,
      "approved",
    );
    TestValidator.predicate(
      `request ${request.id} respondedAt is populated when approved`,
      request.respondedAt !== null,
    );
  }
  // 4. Test filtering by status='rejected'
  const rejectedResult =
    await api.functional.shoppingMall.admin.cancellationRequests.index(
      adminConnection,
      {
        body: {
          status: "rejected",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(rejectedResult);
  // Verify pagination reflects filtered results
  TestValidator.predicate(
    "rejected filter returns valid pagination",
    rejectedResult.pagination.records >= 0,
  );
  // Verify all returned requests have status='rejected' with both fields populated
  for (const request of rejectedResult.data) {
    TestValidator.equals(
      `request ${request.id} has status rejected`,
      request.status,
      "rejected",
    );
    TestValidator.predicate(
      `request ${request.id} respondedAt is populated when rejected`,
      request.respondedAt !== null,
    );
    TestValidator.predicate(
      `request ${request.id} rejectionReason is populated when rejected`,
      request.rejectionReason !== null,
    );
  }
  // 5. Test pagination with filter applied
  const paginatedResult =
    await api.functional.shoppingMall.admin.cancellationRequests.index(
      adminConnection,
      {
        body: {
          status: "pending",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(paginatedResult);
  // Verify pagination metadata
  TestValidator.equals(
    "paginated result limit matches request",
    paginatedResult.pagination.limit,
    10,
  );
  TestValidator.equals(
    "paginated result current page",
    paginatedResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "paginated result pages calculated correctly",
    paginatedResult.pagination.pages ===
      Math.ceil(paginatedResult.pagination.records / 10),
  );
  // 6. Test that data array respects limit
  TestValidator.predicate(
    "data array respects limit",
    paginatedResult.data.length <= 10,
  );
}
