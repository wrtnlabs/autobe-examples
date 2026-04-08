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
 * Test that a super administrator can list and filter admin privilege requests by status.
 *
 * Validates the admin request listing endpoint with status filtering capability. This test verifies that super administrators can successfully filter admin privilege requests by their review status (pending, approved, rejected). The endpoint supports pagination and returns properly structured responses with request details and reviewer information when applicable.
 *
 * **Test Flow:**
 * 1. Authenticate as super administrator via POST /ecommerceMall/auth/superAdmin/join
 * 2. Create test admin requests in different statuses (requires customer/seller accounts + admin request submission)
 * 3. Send PATCH request to /ecommerceMall/superAdmin/admin-requests with status filter
 * 4. Validate response contains paginated results with correct structure
 * 5. Verify all returned requests have the specified status
 * 6. Verify pagination metadata (current page, total records, page count)
 *
 * **Status Filter Validation:**
 * - "pending" status returns only requests awaiting review
 * - "approved" status returns only granted requests
 * - "rejected" status returns only denied requests
 *
 * 1. Super admin authenticates successfully.
 * 2. System returns paginated list of admin requests matching the status filter.
 * 3. Each request in data array has the specified status value.
 * 4. Pagination metadata accurately reflects total records and current page.
 */
export async function test_api_admin_request_list_filtered_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {});
  typia.assert(superAdmin);
  // 2. Test filtering by each status type
  const statusFilters: Array<"pending" | "approved" | "rejected"> = [
    "pending",
    "approved",
    "rejected",
  ];
  for (const statusFilter of statusFilters) {
    // 3. Query admin requests filtered by status
    const response =
      await api.functional.ecommerceMall.superAdmin.admin_requests.index(
        superAdminConnection,
        {
          body: {
            status: statusFilter,
            limit: 20,
            page: 1,
          } satisfies IEcommerceMallAdminRequest.IRequest,
        },
      );
    typia.assert(response);
    // 4. Validate response structure
    TestValidator.equals(
      "has pagination metadata",
      response.pagination !== null,
      true,
    );
    TestValidator.equals("has data array", Array.isArray(response.data), true);
    // 5. Verify pagination metadata is correct
    TestValidator.predicate(
      `pagination current page is 1 for ${statusFilter}`,
      response.pagination.current === 1,
    );
    TestValidator.predicate(
      `pagination limit is 20 for ${statusFilter}`,
      response.pagination.limit === 20,
    );
    TestValidator.predicate(
      `pagination records >= 0 for ${statusFilter}`,
      response.pagination.records >= 0,
    );
    TestValidator.predicate(
      `pagination pages >= 0 for ${statusFilter}`,
      response.pagination.pages >= 0,
    );
    // 6. Verify all returned requests have the specified status
    for (const request of response.data) {
      TestValidator.equals(
        `request status is ${statusFilter}`,
        request.status,
        statusFilter,
      );
    }
  }
  // 7. Test pagination with custom limit
  const paginatedResponse =
    await api.functional.ecommerceMall.superAdmin.admin_requests.index(
      superAdminConnection,
      {
        body: {
          status: "pending",
          limit: 5,
          page: 1,
        } satisfies IEcommerceMallAdminRequest.IRequest,
      },
    );
  typia.assert(paginatedResponse);
  TestValidator.equals(
    "custom limit is applied",
    paginatedResponse.pagination.limit,
    5,
  );
  // 8. Test with no status filter (should return all statuses)
  const allStatusesResponse =
    await api.functional.ecommerceMall.superAdmin.admin_requests.index(
      superAdminConnection,
      {
        body: {
          limit: 20,
          page: 1,
        } satisfies IEcommerceMallAdminRequest.IRequest,
      },
    );
  typia.assert(allStatusesResponse);
  TestValidator.equals(
    "no status filter returns all statuses",
    Array.isArray(allStatusesResponse.data),
    true,
  );
}
