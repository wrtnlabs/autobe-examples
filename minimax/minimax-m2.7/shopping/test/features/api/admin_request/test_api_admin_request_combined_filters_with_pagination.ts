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
 * Test pagination with multiple combined filters on admin request listing.
 *
 * Validates that the PATCH /ecommerceMall/superAdmin/admin-requests endpoint
 * correctly handles multiple simultaneous filters (status='pending' and
 * requestedGrade='admin') and properly implements pagination metadata.
 *
 * The test verifies that:
 * 1. Combined filters are correctly applied - all results match both criteria
 * 2. Pagination metadata is accurate - page number, limit, total records, total pages
 * 3. Response structure conforms to IPageIEcommerceMallAdminRequest.ISummary
 *
 * **Filters Tested**:
 * - status: 'pending' - only pending requests returned
 * - requestedGrade: 'admin' - only requests for admin grade returned
 *
 * **Pagination Tested**:
 * - Page 1 with default or specified limit
 * - Page 2 navigation with limit=5
 * - Metadata accuracy (current, limit, records, pages)
 *
 * 1. Authenticate as super administrator using join utility.
 * 2. Create actor-specific connection with authorization token.
 * 3. Submit PATCH request with combined filters for pending admin requests.
 * 4. Validate all returned requests have status='pending' AND requestedGrade='admin'.
 * 5. Request page 2 with limit=5 to test pagination navigation.
 * 6. Validate pagination metadata reflects correct page position and data boundaries.
 */
export async function test_api_admin_request_combined_filters_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_admin_join(superAdminConnection, {});
  typia.assert(authorized);
  // 2. First request - get page 1 with combined filters
  const page1Response =
    await api.functional.ecommerceMall.superAdmin.admin_requests.index(
      superAdminConnection,
      {
        body: {
          status: "pending",
          requestedGrade: "admin",
        } satisfies IEcommerceMallAdminRequest.IRequest,
      },
    );
  typia.assert(page1Response);
  // 3. Validate response structure
  TestValidator.equals(
    "has data array",
    Array.isArray(page1Response.data),
    true,
  );
  TestValidator.equals(
    "has pagination object",
    page1Response.pagination !== null && page1Response.pagination !== undefined,
    true,
  );
  // 4. Validate all results match combined filter criteria
  for (const request of page1Response.data) {
    TestValidator.equals("status is pending", request.status, "pending");
    TestValidator.equals(
      "requestedGrade is admin",
      request.requestedGrade,
      "admin",
    );
  }
  // 5. Request page 2 with limit=5
  const page2Limit = 5;
  const page2Response =
    await api.functional.ecommerceMall.superAdmin.admin_requests.index(
      superAdminConnection,
      {
        body: {
          status: "pending",
          requestedGrade: "admin",
          page: 2,
          limit: page2Limit,
        } satisfies IEcommerceMallAdminRequest.IRequest,
      },
    );
  typia.assert(page2Response);
  // 6. Validate pagination metadata for page 2
  TestValidator.equals(
    "pagination current page is 2",
    page2Response.pagination.current,
    2,
  );
  TestValidator.equals(
    "pagination limit is 5",
    page2Response.pagination.limit,
    page2Limit,
  );
  TestValidator.predicate(
    "total records >= 0",
    page2Response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages >= 0",
    page2Response.pagination.pages >= 0,
  );
  // 7. Validate records count does not exceed limit
  TestValidator.predicate(
    "page 2 data count does not exceed limit",
    page2Response.data.length <= page2Limit,
  );
  // 8. Validate all page 2 results also match filter criteria
  for (const request of page2Response.data) {
    TestValidator.equals("page2 status is pending", request.status, "pending");
    TestValidator.equals(
      "page2 requestedGrade is admin",
      request.requestedGrade,
      "admin",
    );
  }
}
