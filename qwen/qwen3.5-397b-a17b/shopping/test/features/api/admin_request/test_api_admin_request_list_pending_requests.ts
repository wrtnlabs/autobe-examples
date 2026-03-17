import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminRequest";
import type { IShoppingMallAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRequest";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
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
 * Test the primary workflow where a super administrator retrieves the list of
 * pending administrator promotion requests awaiting review.
 *
 * Test Steps:
 * 1. Super administrator authenticates via authorize_super_admin_join utility function
 * 2. Super administrator calls PATCH /shoppingMall/superAdmin/admin-requests with
 *    request body filtering by status='PENDING'
 * 3. Verify response contains paginated list of pending requests
 * 4. Each request summary includes: id, reason, status, requested_at, and customer
 *    information (id, email, nickname, phone_number, created_at, deleted_at)
 * 5. Verify pagination metadata is correct (current page, limit, total records,
 *    total pages)
 * 6. Verify requests are sorted by requested_at in descending order (newest first)
 *    by default
 * 7. Verify no approved or rejected requests are included in the results
 *
 * Business Validation:
 * - Only super administrators can access this endpoint
 * - Response excludes soft-deleted requests
 * - Customer information is properly joined and included
 * - Default sorting shows newest requests first for efficient review workflow
 */
export async function test_api_admin_request_list_pending_requests(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super administrator authentication
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSuperAdmin.IJoin,
  });
  typia.assert(authResult);
  // 2. Retrieve pending admin requests with status filter
  const response =
    await api.functional.shoppingMall.superAdmin.admin_requests.index(
      superAdminConnection,
      {
        body: {
          status: "PENDING",
          page: 1,
          limit: 20,
          sort: "requested_at",
          direction: "desc",
        } satisfies IShoppingMallAdminRequest.IRequest,
      },
    );
  typia.assert(response);
  // 3. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is 1",
    () => response.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is 20",
    () => response.pagination.limit === 20,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    () => response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    () => response.pagination.pages >= 0,
  );
  // 4. Validate response data structure
  TestValidator.predicate("data is an array", () =>
    Array.isArray(response.data),
  );
  // 5. Validate each request has PENDING status (business rule)
  for (const request of response.data) {
    TestValidator.equals(
      "request status is PENDING",
      request.status,
      "PENDING",
    );
  }
  // 6. Verify sorting order (newest first) when multiple requests exist
  if (response.data.length > 1) {
    for (let i = 0; i < response.data.length - 1; i++) {
      const current = new Date(response.data[i].requested_at).getTime();
      const next = new Date(response.data[i + 1].requested_at).getTime();
      TestValidator.predicate(
        `request ${i} is newer than or equal to request ${i + 1}`,
        () => current >= next,
      );
    }
  }
  // 7. Verify pagination pages calculation is correct
  const expectedPages =
    response.pagination.records === 0
      ? 0
      : Math.ceil(response.pagination.records / response.pagination.limit);
  TestValidator.equals(
    "pagination pages calculation",
    response.pagination.pages,
    expectedPages,
  );
}
