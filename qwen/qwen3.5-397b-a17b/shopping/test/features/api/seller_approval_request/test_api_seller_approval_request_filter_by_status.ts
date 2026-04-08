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
 * Test filtering seller approval requests by different approval statuses.
 *
 * Validates the status filter functionality for seller approval requests, ensuring that administrators can correctly filter requests by their approval status (pending, approved, rejected). The test verifies that the filter correctly restricts results to matching status only and that the response structure includes all expected fields with appropriate values based on status.
 *
 * Special attention is given to verifying that pending requests have null/undefined reviewedByAdmin and rejectionReason, approved requests have populated reviewedByAdmin, and rejected requests have populated rejectionReason. The pagination metadata is also validated for correctness.
 *
 * 1. Administrator authenticates via admin login endpoint.
 * 2. Administrator queries approval requests with status='pending' filter.
 * 3. Verifies all returned requests have status='pending'.
 * 4. Verifies pending requests show null/undefined for reviewedByAdmin and rejectionReason.
 * 5. Repeats with status='approved' filter.
 * 6. Verifies all returned requests have status='approved'.
 * 7. Verifies approved requests show reviewedByAdmin populated.
 * 8. Repeats with status='rejected' filter.
 * 9. Verifies all returned requests have status='rejected'.
 * 10. Verifies rejected requests show rejectionReason populated.
 * 11. Validates pagination metadata is correct for all queries.
 */
export async function test_api_seller_approval_request_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.ILogin,
  });
  // 2. Test pending status filter
  const pendingResult =
    await api.functional.shoppingMall.seller.approval_requests.index(
      adminConnection,
      {
        body: {
          status: "pending",
        } satisfies IShoppingMallSellerApprovalRequest.IRequest,
      },
    );
  typia.assert(pendingResult);
  // 3-4. Verify all pending requests have correct status and fields
  for (const request of pendingResult.data) {
    TestValidator.equals(
      "pending status matches filter",
      request.status,
      "pending",
    );
    TestValidator.predicate(
      "pending reviewedByAdmin is null/undefined",
      request.reviewedByAdmin === null || request.reviewedByAdmin === undefined,
    );
    TestValidator.predicate(
      "pending rejectionReason is null/undefined",
      request.rejectionReason === null || request.rejectionReason === undefined,
    );
  }
  // 5. Test approved status filter
  const approvedResult =
    await api.functional.shoppingMall.seller.approval_requests.index(
      adminConnection,
      {
        body: {
          status: "approved",
        } satisfies IShoppingMallSellerApprovalRequest.IRequest,
      },
    );
  typia.assert(approvedResult);
  // 6-7. Verify all approved requests have correct status and reviewedByAdmin
  for (const request of approvedResult.data) {
    TestValidator.equals(
      "approved status matches filter",
      request.status,
      "approved",
    );
    TestValidator.predicate(
      "approved reviewedByAdmin is populated",
      request.reviewedByAdmin !== null && request.reviewedByAdmin !== undefined,
    );
  }
  // 8. Test rejected status filter
  const rejectedResult =
    await api.functional.shoppingMall.seller.approval_requests.index(
      adminConnection,
      {
        body: {
          status: "rejected",
        } satisfies IShoppingMallSellerApprovalRequest.IRequest,
      },
    );
  typia.assert(rejectedResult);
  // 9-10. Verify all rejected requests have correct status and rejectionReason
  for (const request of rejectedResult.data) {
    TestValidator.equals(
      "rejected status matches filter",
      request.status,
      "rejected",
    );
    TestValidator.predicate(
      "rejected rejectionReason is populated",
      request.rejectionReason !== null && request.rejectionReason !== undefined,
    );
  }
  // 11. Validate pagination metadata for all queries
  TestValidator.predicate(
    "pending pagination current >= 1",
    pendingResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pending pagination limit >= 1",
    pendingResult.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pending pagination records >= 0",
    pendingResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pending pagination pages >= 0",
    pendingResult.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "approved pagination current >= 1",
    approvedResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "approved pagination limit >= 1",
    approvedResult.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "approved pagination records >= 0",
    approvedResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "approved pagination pages >= 0",
    approvedResult.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "rejected pagination current >= 1",
    rejectedResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "rejected pagination limit >= 1",
    rejectedResult.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "rejected pagination records >= 0",
    rejectedResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "rejected pagination pages >= 0",
    rejectedResult.pagination.pages >= 0,
  );
}
