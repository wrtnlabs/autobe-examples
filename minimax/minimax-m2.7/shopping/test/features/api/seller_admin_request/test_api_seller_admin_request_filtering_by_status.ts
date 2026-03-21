import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerAdminRequest";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSellerAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerAdminRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_seller_admin_request_filtering_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super admin connection for authentication
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Test filtering by 'pending' status
  const pendingRequests =
    await api.functional.ecommerceMall.superAdmin.seller.admin_requests.index(
      superAdminConnection,
      {
        body: {
          status: "pending",
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallSellerAdminRequest.IRequest,
      },
    );
  typia.assert(pendingRequests);
  TestValidator.equals(
    "pending page has pagination",
    pendingRequests.pagination !== null,
    true,
  );
  TestValidator.predicate("all pending requests have 'pending' status", () =>
    pendingRequests.data.every((req) => req.status === "pending"),
  );
  // 3. Test filtering by 'approved' status
  const approvedRequests =
    await api.functional.ecommerceMall.superAdmin.seller.admin_requests.index(
      superAdminConnection,
      {
        body: {
          status: "approved",
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallSellerAdminRequest.IRequest,
      },
    );
  typia.assert(approvedRequests);
  TestValidator.equals(
    "approved page has pagination",
    approvedRequests.pagination !== null,
    true,
  );
  TestValidator.predicate("all approved requests have 'approved' status", () =>
    approvedRequests.data.every((req) => req.status === "approved"),
  );
  // 4. Test filtering by 'rejected' status
  const rejectedRequests =
    await api.functional.ecommerceMall.superAdmin.seller.admin_requests.index(
      superAdminConnection,
      {
        body: {
          status: "rejected",
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallSellerAdminRequest.IRequest,
      },
    );
  typia.assert(rejectedRequests);
  TestValidator.equals(
    "rejected page has pagination",
    rejectedRequests.pagination !== null,
    true,
  );
  TestValidator.predicate("all rejected requests have 'rejected' status", () =>
    rejectedRequests.data.every((req) => req.status === "rejected"),
  );
  // 5. Test without status filter (should return all statuses)
  const allRequests =
    await api.functional.ecommerceMall.superAdmin.seller.admin_requests.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallSellerAdminRequest.IRequest,
      },
    );
  typia.assert(allRequests);
  TestValidator.equals(
    "all requests page has pagination",
    allRequests.pagination !== null,
    true,
  );
  TestValidator.predicate(
    "all requests contains mixed statuses",
    () =>
      allRequests.data.some((req) => req.status === "pending") ||
      allRequests.data.some((req) => req.status === "approved") ||
      allRequests.data.some((req) => req.status === "rejected"),
  );
  // 6. Verify pagination metadata structure
  TestValidator.predicate(
    "pagination has valid current page",
    pendingRequests.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has valid limit",
    pendingRequests.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination has valid records count",
    pendingRequests.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has valid pages count",
    pendingRequests.pagination.pages >= 0,
  );
}
