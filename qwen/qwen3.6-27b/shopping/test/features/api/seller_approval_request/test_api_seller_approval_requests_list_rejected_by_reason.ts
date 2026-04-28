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
 * Test the workflow where an administrator searches through rejected seller approval requests using the reason text filter to find specific rejection patterns.
 *
 * Validates the complete search flow including administrative authentication and seller approval request listing with filtering capabilities.
 * Ensures that the search correctly filters by status 'rejected' and optional reason text matching.
 * Each rejected request summary contains a non-null reason field populated with the administrator's rejection explanation.
 * Seller summary is included for each request allowing identification of which seller was rejected.
 * created_at shows when the request was originally submitted, updated_at shows when the rejection decision was made.
 * Date-based filtering works correctly with created_at_gte, created_at_lte, updated_at_gte, updated_at_lte parameters.
 *
 * 1. Administrator registers using utility function authorize_admin_join.
 * 2. Administrator calls PATCH /ecommercePlatform/admin/seller-approval-requests with status='rejected' and reason text filter.
 * 3. Validate returned requests have 'rejected' status, non-null reason fields, seller summaries included.
 * 4. Validate date-based filtering parameters with created_at_gte, created_at_lte, updated_at_gte, updated_at_lte.
 */
export async function test_api_seller_approval_requests_list_rejected_by_reason(
  connection: api.IConnection,
) {
  // 1. Admin authentication via utility function
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: "e2e-admin-rejected-search@example.com",
      href: "https://test-platform.example.com/admin/register",
      password: "SecurePassword123!",
      referrer: "https://test-platform.example.com",
    } satisfies IEcommercePlatformAdmin.IJoin,
  });
  // 2. Search for rejected seller approval requests with reason filter
  const reasonText = "policy";
  const rejectedApprovalRequests =
    await api.functional.ecommercePlatform.admin.seller_approval_requests.index(
      adminConnection,
      {
        body: {
          status: "rejected",
          reason: reasonText,
        } satisfies IEcommercePlatformSellerApprovalRequest.IRequest,
      },
    );
  typia.assert(rejectedApprovalRequests);
  // 3. Validate response structure and pagination
  TestValidator.predicate(
    "pagination metadata exists",
    rejectedApprovalRequests.pagination !== undefined,
  );
  TestValidator.equals(
    "pagination current page",
    rejectedApprovalRequests.pagination.current,
    1,
  );
  TestValidator.predicate(
    "data array is present",
    rejectedApprovalRequests.data !== undefined,
  );
  // 4. Validate each request has rejected status and non-null reason containing search text
  for (const request of rejectedApprovalRequests.data) {
    TestValidator.equals(
      "request status is rejected",
      request.status,
      "rejected",
    );
    TestValidator.predicate(
      "reason field is non-null for rejected request",
      request.reason !== null,
    );
    TestValidator.predicate(
      "reason contains search text (case-insensitive)",
      request.reason !== null &&
        request.reason!.toLowerCase().includes(reasonText.toLowerCase()),
    );
    TestValidator.predicate(
      "seller summary exists with id",
      request.seller.id !== undefined,
    );
    TestValidator.predicate(
      "seller summary has email",
      request.seller.email !== undefined,
    );
    TestValidator.predicate(
      "created_at timestamp exists",
      request.created_at !== undefined,
    );
    TestValidator.predicate(
      "updated_at timestamp exists",
      request.updated_at !== undefined,
    );
  }
  // 5. Test date-based filtering with created_at_gte and created_at_lte
  const now = new Date();
  const pastDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const dateFilteredRequests =
    await api.functional.ecommercePlatform.admin.seller_approval_requests.index(
      adminConnection,
      {
        body: {
          status: "rejected",
          reason: reasonText,
          created_at_gte: pastDate.toISOString(),
          created_at_lte: now.toISOString(),
        } satisfies IEcommercePlatformSellerApprovalRequest.IRequest,
      },
    );
  typia.assert(dateFilteredRequests);
  // 6. Validate date-filtered results
  TestValidator.predicate(
    "date-filtered pagination exists",
    dateFilteredRequests.pagination !== undefined,
  );
  for (const request of dateFilteredRequests.data) {
    TestValidator.equals(
      "date-filtered status is rejected",
      request.status,
      "rejected",
    );
    TestValidator.predicate(
      "date-filtered reason is non-null",
      request.reason !== null,
    );
    const requestDate = new Date(request.created_at);
    TestValidator.predicate(
      "created_at is within date range",
      requestDate >= pastDate && requestDate <= now,
    );
  }
  // 7. Test updated_at_gte and updated_at_lte filtering
  const updatedFilteredRequests =
    await api.functional.ecommercePlatform.admin.seller_approval_requests.index(
      adminConnection,
      {
        body: {
          status: "rejected",
          reason: reasonText,
          updated_at_gte: pastDate.toISOString(),
          updated_at_lte: now.toISOString(),
        } satisfies IEcommercePlatformSellerApprovalRequest.IRequest,
      },
    );
  typia.assert(updatedFilteredRequests);
  // 8. Validate updated_at-filtered results
  TestValidator.predicate(
    "updated_at-filtered pagination exists",
    updatedFilteredRequests.pagination !== undefined,
  );
  for (const request of updatedFilteredRequests.data) {
    TestValidator.equals(
      "updated_at-filtered status is rejected",
      request.status,
      "rejected",
    );
    TestValidator.predicate(
      "updated_at-filtered reason is non-null",
      request.reason !== null,
    );
    const updatedAt = new Date(request.updated_at);
    TestValidator.predicate(
      "updated_at is within date range",
      updatedAt >= pastDate && updatedAt <= now,
    );
  }
}
