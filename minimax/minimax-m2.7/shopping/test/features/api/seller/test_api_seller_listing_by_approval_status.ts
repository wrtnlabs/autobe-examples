import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test that an authenticated administrator can list and filter sellers by approval status.
 *
 * Validates the seller listing and filtering functionality for administrators. The test verifies that when an admin authenticates and requests sellers filtered by a specific approval status, the response contains only sellers matching that status. Pagination metadata is validated to ensure correct page information is returned.
 *
 * **Test Flow:**
 *
 * 1. Administrator authenticates via the admin join endpoint to obtain authorization.
 * 2. Admin requests seller listing with status filter set to 'pending'.
 * 3. Response is validated to contain only pending sellers and correct pagination metadata.
 * 4. Admin requests seller listing with status filter set to 'approved'.
 * 5. Response is validated to contain only approved sellers and correct pagination metadata.
 * 6. Admin requests seller listing with status filter set to 'rejected'.
 * 7. Response is validated to contain only rejected sellers and correct pagination metadata.
 *
 * @param connection - Base API connection for the test
 */
export async function test_api_seller_listing_by_approval_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. List sellers with status filter 'pending'
  const pendingResult = await api.functional.ecommerceMall.admin.sellers.index(
    adminConnection,
    {
      body: {
        status: "pending",
        page: 1,
        limit: 20,
      } satisfies IEcommerceMallSeller.IRequest,
    },
  );
  typia.assert(pendingResult);
  // Validate pagination metadata
  TestValidator.equals(
    "pending listing has pagination",
    pendingResult.pagination !== null,
    true,
  );
  TestValidator.predicate(
    "pending listing pagination has valid fields",
    pendingResult.pagination.current >= 1 &&
      pendingResult.pagination.limit > 0 &&
      pendingResult.pagination.records >= 0 &&
      pendingResult.pagination.pages >= 0,
  );
  // Validate all returned sellers have 'pending' status
  for (const seller of pendingResult.data) {
    TestValidator.equals(
      "seller approval status is pending",
      seller.approvalStatus,
      "pending",
    );
  }
  // 3. List sellers with status filter 'approved'
  const approvedResult = await api.functional.ecommerceMall.admin.sellers.index(
    adminConnection,
    {
      body: {
        status: "approved",
        page: 1,
        limit: 20,
      } satisfies IEcommerceMallSeller.IRequest,
    },
  );
  typia.assert(approvedResult);
  // Validate pagination metadata
  TestValidator.equals(
    "approved listing has pagination",
    approvedResult.pagination !== null,
    true,
  );
  TestValidator.predicate(
    "approved listing pagination has valid fields",
    approvedResult.pagination.current >= 1 &&
      approvedResult.pagination.limit > 0 &&
      approvedResult.pagination.records >= 0 &&
      approvedResult.pagination.pages >= 0,
  );
  // Validate all returned sellers have 'approved' status
  for (const seller of approvedResult.data) {
    TestValidator.equals(
      "seller approval status is approved",
      seller.approvalStatus,
      "approved",
    );
  }
  // 4. List sellers with status filter 'rejected'
  const rejectedResult = await api.functional.ecommerceMall.admin.sellers.index(
    adminConnection,
    {
      body: {
        status: "rejected",
        page: 1,
        limit: 20,
      } satisfies IEcommerceMallSeller.IRequest,
    },
  );
  typia.assert(rejectedResult);
  // Validate pagination metadata
  TestValidator.equals(
    "rejected listing has pagination",
    rejectedResult.pagination !== null,
    true,
  );
  TestValidator.predicate(
    "rejected listing pagination has valid fields",
    rejectedResult.pagination.current >= 1 &&
      rejectedResult.pagination.limit > 0 &&
      rejectedResult.pagination.records >= 0 &&
      rejectedResult.pagination.pages >= 0,
  );
  // Validate all returned sellers have 'rejected' status
  for (const seller of rejectedResult.data) {
    TestValidator.equals(
      "seller approval status is rejected",
      seller.approvalStatus,
      "rejected",
    );
  }
}
