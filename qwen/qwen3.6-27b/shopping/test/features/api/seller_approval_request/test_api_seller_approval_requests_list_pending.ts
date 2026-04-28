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
 * Test listing pending seller approval requests for administrative review.
 *
 * Validates that the seller approval request listing endpoint returns properly paginated results filtered by status. The test registers an admin, queries for pending requests, and verifies the response structure including pagination metadata and request details.
 *
 * Special attention is given to verifying pagination metadata accuracy, the presence of seller summary information within each request, and the null reason field for pending requests.
 *
 * 1. Admin registers for the ecommerce platform.
 * 2. Admin queries seller approval requests filtered by 'pending' status.
 * 3. Validates response contains proper pagination metadata.
 * 4. Validates each request has correct structure with seller summary and null reason.
 * 5. When no sellers exist, validates empty data array with records: 0.
 */
export async function test_api_seller_approval_requests_list_pending(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin registration
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {
    body: {},
  });
  typia.assert(adminAuthorized);
  // 2. Query pending seller approval requests
  const body = {
    status: "pending",
  } satisfies IEcommercePlatformSellerApprovalRequest.IRequest;
  const result =
    await api.functional.ecommercePlatform.admin.seller_approval_requests.index(
      adminConnection,
      { body },
    );
  typia.assert(result);
  // 3. Validate pagination metadata
  TestValidator.equals("current page is 1", result.pagination.current, 1);
  TestValidator.predicate("limit is positive", result.pagination.limit > 0);
  TestValidator.predicate(
    "records count is non-negative",
    result.pagination.records >= 0,
  );
  // 4. Validate data array length matches records
  TestValidator.equals(
    "data length matches records",
    result.data.length,
    result.pagination.records,
  );
  // 5. Validate each request in data array (if any exist)
  await ArrayUtil.asyncForEach(result.data, async (request) => {
    typia.assert(request);
    // Validate pending status
    TestValidator.equals("status is pending", request.status, "pending");
    // Validate reason is null for pending requests
    TestValidator.equals("reason is null for pending", request.reason, null);
    // Validate seller summary exists
    typia.assert(request.seller);
    // Validate timestamps
    TestValidator.predicate(
      "created_at is valid",
      request.created_at.length > 0,
    );
    TestValidator.predicate(
      "updated_at is valid",
      request.updated_at.length > 0,
    );
  });
  // 6. Validate pages calculation consistency
  const expectedPages =
    result.pagination.limit > 0
      ? Math.ceil(result.pagination.records / result.pagination.limit)
      : 0;
  TestValidator.equals(
    "pages calculation correct",
    result.pagination.pages,
    expectedPages,
  );
}
