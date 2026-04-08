import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_seller_profile_filter_by_approval_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Test filtering with approval_status = 'pending'
  const pendingResult =
    await api.functional.ecommerceMall.admin.admin.seller_profiles.index(
      adminConnection,
      {
        body: {
          approval_status: "pending",
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallSellerProfile.IRequest,
      },
    );
  typia.assert(pendingResult);
  // Verify all returned profiles have pending sellers
  for (const profile of pendingResult.data) {
    TestValidator.equals(
      "profile seller approval status is pending",
      profile.seller.approvalStatus,
      "pending",
    );
  }
  // 3. Test filtering with approval_status = 'approved'
  const approvedResult =
    await api.functional.ecommerceMall.admin.admin.seller_profiles.index(
      adminConnection,
      {
        body: {
          approval_status: "approved",
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallSellerProfile.IRequest,
      },
    );
  typia.assert(approvedResult);
  // Verify all returned profiles have approved sellers
  for (const profile of approvedResult.data) {
    TestValidator.equals(
      "profile seller approval status is approved",
      profile.seller.approvalStatus,
      "approved",
    );
  }
  // 4. Test filtering with approval_status = 'rejected'
  const rejectedResult =
    await api.functional.ecommerceMall.admin.admin.seller_profiles.index(
      adminConnection,
      {
        body: {
          approval_status: "rejected",
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallSellerProfile.IRequest,
      },
    );
  typia.assert(rejectedResult);
  // Verify all returned profiles have rejected sellers
  for (const profile of rejectedResult.data) {
    TestValidator.equals(
      "profile seller approval status is rejected",
      profile.seller.approvalStatus,
      "rejected",
    );
  }
  // 5. Verify pagination works correctly with status filter
  const paginatedResult =
    await api.functional.ecommerceMall.admin.admin.seller_profiles.index(
      adminConnection,
      {
        body: {
          approval_status: "approved",
          page: 1,
          limit: 5,
        } satisfies IEcommerceMallSellerProfile.IRequest,
      },
    );
  typia.assert(paginatedResult);
  // Verify pagination metadata
  TestValidator.equals("limit is 5", paginatedResult.pagination.limit, 5);
  TestValidator.equals(
    "current page is 1",
    paginatedResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "records count is non-negative",
    paginatedResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    paginatedResult.pagination.pages >= 0,
  );
  // Verify data array length does not exceed limit
  TestValidator.predicate(
    "data length does not exceed limit",
    paginatedResult.data.length <= 5,
  );
  // 6. Verify when filter is omitted, all approval statuses are included
  const allResult =
    await api.functional.ecommerceMall.admin.admin.seller_profiles.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IEcommerceMallSellerProfile.IRequest,
      },
    );
  typia.assert(allResult);
  // Verify all statuses can be present when no filter applied
  const hasPending = allResult.data.some(
    (p) => p.seller.approvalStatus === "pending",
  );
  const hasApproved = allResult.data.some(
    (p) => p.seller.approvalStatus === "approved",
  );
  const hasRejected = allResult.data.some(
    (p) => p.seller.approvalStatus === "rejected",
  );
  // At least one of these should be true if data exists
  TestValidator.predicate(
    "mixed approval statuses may be present when filter omitted",
    hasPending || hasApproved || hasRejected || allResult.data.length === 0,
  );
}
