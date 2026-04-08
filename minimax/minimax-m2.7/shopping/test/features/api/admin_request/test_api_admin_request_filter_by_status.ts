import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequest";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test filtering admin requests by status for super administrators.
 *
 * Validates the admin request filtering functionality by authenticating as a super
 * administrator and querying the admin requests endpoint with different status filters.
 * Verifies that the filtering mechanism correctly returns only requests matching the
 * specified status (pending, approved, or rejected).
 *
 * 1. Authenticate as super administrator using valid credentials.
 * 2. Query admin requests with status filter set to 'pending'.
 * 3. Validate response contains only requests with pending status.
 * 4. Validate pagination metadata is present and accurate.
 * 5. Query with 'approved' status filter and verify results.
 * 6. Query with 'rejected' status filter and verify results.
 * 7. Validate filtering works correctly with pagination parameters.
 *
 * @param connection Base API connection for the test
 */
export async function test_api_admin_request_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_admin_join(superAdminConnection, {});
  typia.assert(authorized);
  // 2. Test filtering by 'pending' status
  const pendingResult =
    await api.functional.ecommerceMall.superAdmin.admin.admin_requests.index(
      superAdminConnection,
      {
        body: {
          status: "pending",
        } satisfies IEcommerceMallAdminRequest.IRequest,
      },
    );
  typia.assert(pendingResult);
  // Validate all returned requests have pending status
  TestValidator.predicate(
    "pending filter returns only pending requests",
    pendingResult.data.every((request) => request.status === "pending"),
  );
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page is valid",
    pendingResult.pagination.current >= 0,
    true,
  );
  TestValidator.equals(
    "pagination limit is valid",
    pendingResult.pagination.limit > 0,
    true,
  );
  TestValidator.equals(
    "pagination records is valid",
    pendingResult.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "pagination pages is valid",
    pendingResult.pagination.pages >= 0,
    true,
  );
  // 3. Test filtering by 'approved' status
  const approvedResult =
    await api.functional.ecommerceMall.superAdmin.admin.admin_requests.index(
      superAdminConnection,
      {
        body: {
          status: "approved",
        } satisfies IEcommerceMallAdminRequest.IRequest,
      },
    );
  typia.assert(approvedResult);
  // Validate all returned requests have approved status
  TestValidator.predicate(
    "approved filter returns only approved requests",
    approvedResult.data.every((request) => request.status === "approved"),
  );
  // 4. Test filtering by 'rejected' status
  const rejectedResult =
    await api.functional.ecommerceMall.superAdmin.admin.admin_requests.index(
      superAdminConnection,
      {
        body: {
          status: "rejected",
        } satisfies IEcommerceMallAdminRequest.IRequest,
      },
    );
  typia.assert(rejectedResult);
  // Validate all returned requests have rejected status
  TestValidator.predicate(
    "rejected filter returns only rejected requests",
    rejectedResult.data.every((request) => request.status === "rejected"),
  );
  // 5. Test filtering with pagination
  const paginatedResult =
    await api.functional.ecommerceMall.superAdmin.admin.admin_requests.index(
      superAdminConnection,
      {
        body: {
          status: "pending",
          page: 1,
          limit: 5,
        } satisfies IEcommerceMallAdminRequest.IRequest,
      },
    );
  typia.assert(paginatedResult);
  // Validate pagination parameters are respected
  TestValidator.equals(
    "requested limit is respected",
    paginatedResult.pagination.limit,
    5,
  );
  TestValidator.equals(
    "requested page is respected",
    paginatedResult.pagination.current,
    1,
  );
  // 6. Test without status filter (should return all statuses)
  const allResult =
    await api.functional.ecommerceMall.superAdmin.admin.admin_requests.index(
      superAdminConnection,
      {
        body: {} satisfies IEcommerceMallAdminRequest.IRequest,
      },
    );
  typia.assert(allResult);
  // When no filter is applied, data can contain mixed statuses
  const hasMixedStatuses =
    allResult.data.some((r) => r.status === "pending") &&
    allResult.data.some((r) => r.status === "approved") &&
    allResult.data.some((r) => r.status === "rejected");
  TestValidator.predicate(
    "no filter returns mixed statuses when available",
    hasMixedStatuses || allResult.data.length > 0,
  );
}
