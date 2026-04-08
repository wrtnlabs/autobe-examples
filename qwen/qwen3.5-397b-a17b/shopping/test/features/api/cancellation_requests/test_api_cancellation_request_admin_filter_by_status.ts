import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationRequest";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator filtering of cancellation requests by status.
 *
 * Validates that administrators can filter cancellation requests by workflow status (pending, approved, rejected) to efficiently review requests requiring attention. Ensures the status filter returns only matching requests and that pagination metadata accurately reflects filtered results.
 *
 * The test verifies that each cancellation request in the filtered response has the correct status value, and that responded_at timestamps are appropriately set (null for pending requests, populated for approved/rejected requests). This enables administrators to monitor pending requests that may require intervention and review historical decisions.
 *
 * 1. Administrator account created and authenticated.
 * 2. Filter by 'pending' status - validates only pending requests returned, responded_at is null.
 * 3. Filter by 'approved' status - validates only approved requests returned, responded_at is populated.
 * 4. Filter by 'rejected' status - validates only rejected requests returned, responded_at is populated.
 * 5. Pagination metadata validated for each filter.
 */
export async function test_api_cancellation_request_admin_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: RandomGenerator.pick(["regular", "super"] as const),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Test filtering by 'pending' status
  const pendingRequests =
    await api.functional.shoppingMall.admin.cancellation_requests.index(
      adminConnection,
      {
        body: {
          status: "pending",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(pendingRequests);
  // Validate all returned requests have status 'pending'
  for (const request of pendingRequests.data) {
    TestValidator.equals("pending request status", request.status, "pending");
    TestValidator.predicate(
      "pending has no responded_at",
      request.responded_at === null || request.responded_at === undefined,
    );
  }
  // Validate pagination metadata
  TestValidator.predicate(
    "current page is 1",
    pendingRequests.pagination.current === 1,
  );
  TestValidator.predicate(
    "limit is 20",
    pendingRequests.pagination.limit === 20,
  );
  TestValidator.predicate(
    "records count matches data length",
    pendingRequests.pagination.records >= pendingRequests.data.length,
  );
  // 3. Test filtering by 'approved' status
  const approvedRequests =
    await api.functional.shoppingMall.admin.cancellation_requests.index(
      adminConnection,
      {
        body: {
          status: "approved",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(approvedRequests);
  // Validate all returned requests have status 'approved'
  for (const request of approvedRequests.data) {
    TestValidator.equals("approved request status", request.status, "approved");
    TestValidator.predicate(
      "approved has responded_at",
      request.responded_at !== null && request.responded_at !== undefined,
    );
  }
  // 4. Test filtering by 'rejected' status
  const rejectedRequests =
    await api.functional.shoppingMall.admin.cancellation_requests.index(
      adminConnection,
      {
        body: {
          status: "rejected",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(rejectedRequests);
  // Validate all returned requests have status 'rejected'
  for (const request of rejectedRequests.data) {
    TestValidator.equals("rejected request status", request.status, "rejected");
    TestValidator.predicate(
      "rejected has responded_at",
      request.responded_at !== null && request.responded_at !== undefined,
    );
  }
  // 5. Validate pagination structure consistency
  TestValidator.predicate(
    "pending pages is non-negative",
    pendingRequests.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "approved pages is non-negative",
    approvedRequests.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "rejected pages is non-negative",
    rejectedRequests.pagination.pages >= 0,
  );
}
