import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPostPurchaseRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPostPurchaseRefundRequest";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallPostPurchaseRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPostPurchaseRefundRequest";
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
 * Test administrator filtering of refund requests by workflow status.
 *
 * Validates the admin's ability to filter refund requests by their current workflow status (pending, approved, rejected). The test authenticates as an administrator and queries the refund requests endpoint with various status filters to ensure proper filtering logic.
 *
 * The test covers single status filtering for each of the three valid statuses, as well as multi-status filtering to verify OR logic behavior. Pagination metadata is validated to ensure it accurately reflects the filtered result counts.
 *
 * 1. Administrator authentication via join operation.
 * 2. Query refund requests with status filter 'pending' and verify all results have pending status.
 * 3. Query refund requests with status filter 'approved' and verify all results have approved status.
 * 4. Query refund requests with status filter 'rejected' and verify all results have rejected status.
 * 5. Query refund requests with multiple status filters ['pending', 'approved'] and verify results match either status.
 * 6. Validate pagination metadata (current page, limit, records, pages) for each filtered query.
 */
export async function test_api_refund_request_admin_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: RandomGenerator.pick(["regular", "super"] as const),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Filter by 'pending' status
  const pendingResult =
    await api.functional.shoppingMall.admin.post_purchase.refund_requests.index(
      adminConnection,
      {
        body: {
          status: "pending",
          page: 1,
          limit: 100,
        } satisfies IShoppingMallPostPurchaseRefundRequest.IRequest,
      },
    );
  typia.assert(pendingResult);
  // Verify all returned requests have pending status
  for (const request of pendingResult.data) {
    TestValidator.equals("pending status filter", request.status, "pending");
  }
  // Verify pagination metadata
  TestValidator.predicate(
    "pending page is 1",
    pendingResult.pagination.current === 1,
  );
  TestValidator.predicate(
    "pending limit is 100",
    pendingResult.pagination.limit === 100,
  );
  TestValidator.predicate(
    "pending records >= data length",
    pendingResult.pagination.records >= pendingResult.data.length,
  );
  TestValidator.predicate(
    "pending pages calculated correctly",
    pendingResult.pagination.pages ===
      Math.ceil(
        pendingResult.pagination.records / pendingResult.pagination.limit,
      ),
  );
  // 3. Filter by 'approved' status
  const approvedResult =
    await api.functional.shoppingMall.admin.post_purchase.refund_requests.index(
      adminConnection,
      {
        body: {
          status: "approved",
          page: 1,
          limit: 100,
        } satisfies IShoppingMallPostPurchaseRefundRequest.IRequest,
      },
    );
  typia.assert(approvedResult);
  // Verify all returned requests have approved status
  for (const request of approvedResult.data) {
    TestValidator.equals("approved status filter", request.status, "approved");
  }
  // Verify pagination metadata
  TestValidator.predicate(
    "approved page is 1",
    approvedResult.pagination.current === 1,
  );
  TestValidator.predicate(
    "approved limit is 100",
    approvedResult.pagination.limit === 100,
  );
  TestValidator.predicate(
    "approved records >= data length",
    approvedResult.pagination.records >= approvedResult.data.length,
  );
  TestValidator.predicate(
    "approved pages calculated correctly",
    approvedResult.pagination.pages ===
      Math.ceil(
        approvedResult.pagination.records / approvedResult.pagination.limit,
      ),
  );
  // 4. Filter by 'rejected' status
  const rejectedResult =
    await api.functional.shoppingMall.admin.post_purchase.refund_requests.index(
      adminConnection,
      {
        body: {
          status: "rejected",
          page: 1,
          limit: 100,
        } satisfies IShoppingMallPostPurchaseRefundRequest.IRequest,
      },
    );
  typia.assert(rejectedResult);
  // Verify all returned requests have rejected status
  for (const request of rejectedResult.data) {
    TestValidator.equals("rejected status filter", request.status, "rejected");
  }
  // Verify pagination metadata
  TestValidator.predicate(
    "rejected page is 1",
    rejectedResult.pagination.current === 1,
  );
  TestValidator.predicate(
    "rejected limit is 100",
    rejectedResult.pagination.limit === 100,
  );
  TestValidator.predicate(
    "rejected records >= data length",
    rejectedResult.pagination.records >= rejectedResult.data.length,
  );
  TestValidator.predicate(
    "rejected pages calculated correctly",
    rejectedResult.pagination.pages ===
      Math.ceil(
        rejectedResult.pagination.records / rejectedResult.pagination.limit,
      ),
  );
  // 5. Filter by multiple statuses ['pending', 'approved']
  const multiStatusResult =
    await api.functional.shoppingMall.admin.post_purchase.refund_requests.index(
      adminConnection,
      {
        body: {
          status: ["pending", "approved"],
          page: 1,
          limit: 100,
        } satisfies IShoppingMallPostPurchaseRefundRequest.IRequest,
      },
    );
  typia.assert(multiStatusResult);
  // Verify all returned requests have either pending or approved status
  for (const request of multiStatusResult.data) {
    TestValidator.predicate(
      "multi-status filter",
      request.status === "pending" || request.status === "approved",
    );
  }
  // Verify pagination metadata for multi-status query
  TestValidator.predicate(
    "multi-status page is 1",
    multiStatusResult.pagination.current === 1,
  );
  TestValidator.predicate(
    "multi-status limit is 100",
    multiStatusResult.pagination.limit === 100,
  );
  TestValidator.predicate(
    "multi-status records >= data length",
    multiStatusResult.pagination.records >= multiStatusResult.data.length,
  );
  TestValidator.predicate(
    "multi-status pages calculated correctly",
    multiStatusResult.pagination.pages ===
      Math.ceil(
        multiStatusResult.pagination.records /
          multiStatusResult.pagination.limit,
      ),
  );
  // 6. Verify multi-status result count equals sum of individual status counts
  const expectedMultiCount =
    pendingResult.pagination.records + approvedResult.pagination.records;
  TestValidator.equals(
    "multi-status records count",
    multiStatusResult.pagination.records,
    expectedMultiCount,
  );
}
