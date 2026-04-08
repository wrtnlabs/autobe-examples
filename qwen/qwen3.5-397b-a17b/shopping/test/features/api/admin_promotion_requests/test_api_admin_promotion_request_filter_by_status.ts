import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminPromotionRequest";
import type { IShoppingMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPromotionRequest";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test filtering administrator promotion requests by workflow status to verify status-based filtering works correctly.
 *
 * Validates the complete status filtering workflow for administrator promotion requests including authentication as super administrator, filtering by different statuses (pending, approved, rejected), and verifying that reviewer information is correctly populated based on status. Ensures that status filtering can be combined with other filters like actorType.
 *
 * Special attention is given to verifying that the reviewer field is null for pending requests and populated for approved/rejected requests, maintaining proper workflow state tracking.
 *
 * 1. Super administrator authenticates via join operation.
 * 2. Filter requests by status 'approved' and verify all have approved status with reviewer.
 * 3. Filter requests by status 'rejected' and verify all have rejected status with reviewer.
 * 4. Filter requests by status 'pending' and verify all have pending status with null reviewer.
 * 5. Verify combined filters (status + actorType) return correct intersection of results.
 */
export async function test_api_admin_promotion_request_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSuperAdmin.IJoin,
  });
  // 2. Filter by approved status
  const approvedResult =
    await api.functional.shoppingMall.superAdmin.admin_promotion_requests.index(
      superAdminConnection,
      {
        body: {
          status: "approved",
        } satisfies IShoppingMallAdminPromotionRequest.IRequest,
      },
    );
  typia.assert(approvedResult);
  // Verify all approved requests have correct status and reviewer
  for (const request of approvedResult.data) {
    TestValidator.equals("approved status", request.status, "approved");
    TestValidator.predicate(
      "reviewer exists for approved",
      request.reviewer !== null,
    );
  }
  // 3. Filter by rejected status
  const rejectedResult =
    await api.functional.shoppingMall.superAdmin.admin_promotion_requests.index(
      superAdminConnection,
      {
        body: {
          status: "rejected",
        } satisfies IShoppingMallAdminPromotionRequest.IRequest,
      },
    );
  typia.assert(rejectedResult);
  // Verify all rejected requests have correct status and reviewer
  for (const request of rejectedResult.data) {
    TestValidator.equals("rejected status", request.status, "rejected");
    TestValidator.predicate(
      "reviewer exists for rejected",
      request.reviewer !== null,
    );
  }
  // 4. Filter by pending status
  const pendingResult =
    await api.functional.shoppingMall.superAdmin.admin_promotion_requests.index(
      superAdminConnection,
      {
        body: {
          status: "pending",
        } satisfies IShoppingMallAdminPromotionRequest.IRequest,
      },
    );
  typia.assert(pendingResult);
  // Verify all pending requests have correct status and null reviewer
  for (const request of pendingResult.data) {
    TestValidator.equals("pending status", request.status, "pending");
    TestValidator.predicate(
      "reviewer null for pending",
      request.reviewer === null,
    );
  }
  // 5. Test combined filters (status + actorType)
  const combinedResult =
    await api.functional.shoppingMall.superAdmin.admin_promotion_requests.index(
      superAdminConnection,
      {
        body: {
          status: "approved",
          actorType: "member",
        } satisfies IShoppingMallAdminPromotionRequest.IRequest,
      },
    );
  typia.assert(combinedResult);
  // Verify combined filter results
  for (const request of combinedResult.data) {
    TestValidator.equals("combined status", request.status, "approved");
    TestValidator.equals("combined actorType", request.actorType, "member");
    TestValidator.predicate(
      "reviewer exists for combined",
      request.reviewer !== null,
    );
  }
  // 6. Validate pagination structure
  TestValidator.predicate(
    "current page valid",
    approvedResult.pagination.current >= 1,
  );
  TestValidator.predicate("limit valid", approvedResult.pagination.limit > 0);
  TestValidator.predicate(
    "records non-negative",
    approvedResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages non-negative",
    approvedResult.pagination.pages >= 0,
  );
}
