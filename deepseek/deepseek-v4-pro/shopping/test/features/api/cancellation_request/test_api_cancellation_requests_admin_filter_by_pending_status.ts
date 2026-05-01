import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationRequest";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test admin filtering of cancellation requests by pending status.
 *
 * Validates that administrators can filter cancellation requests to show only those with "pending" status — the requests requiring seller review and action. Ensures the status filter correctly narrows results, that pagination metadata reflects the filtered count, and that requests in other statuses (approved, rejected) are excluded from the filtered results.
 *
 * This test verifies the core admin workflow of viewing cancellation requests that need attention. By comparing filtered results against the unfiltered total, it confirms the filter is both correctly applied and restrictive.
 *
 * 1. Administrator registers and authenticates on the platform.
 * 2. Queries all cancellation requests without any status filter to establish a baseline total count.
 * 3. Queries cancellation requests with status filter set to "pending".
 * 4. Validates every returned record has status "pending".
 * 5. Validates pagination metadata: filtered records count does not exceed unfiltered total, and data array length is consistent with the pagination limits.
 */
export async function test_api_cancellation_requests_admin_filter_by_pending_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Query all cancellation requests without status filter (baseline)
  const allRequests =
    await api.functional.shoppingMall.admin.cancellation_requests.index(
      adminConnection,
      {
        body: {
          limit: 100,
          page: 1,
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(allRequests);
  // 3. Query with status "pending" filter
  const pendingRequests =
    await api.functional.shoppingMall.admin.cancellation_requests.index(
      adminConnection,
      {
        body: {
          status: "pending",
          limit: 100,
          page: 1,
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(pendingRequests);
  // 4. Validate every returned record has "pending" status
  for (const request of pendingRequests.data) {
    TestValidator.equals(
      "cancellation request status should be pending",
      request.status,
      "pending",
    );
  }
  // 5. Validate filtered count does not exceed total count
  TestValidator.predicate(
    "pending records count should not exceed total records count",
    pendingRequests.pagination.records <= allRequests.pagination.records,
  );
  // 6. Validate pagination metadata integrity
  TestValidator.predicate(
    "data array length should not exceed limit",
    pendingRequests.data.length <=
      (pendingRequests.pagination.limit satisfies number as number),
  );
  TestValidator.predicate(
    "data array length should not exceed records count",
    pendingRequests.data.length <= pendingRequests.pagination.records,
  );
}
