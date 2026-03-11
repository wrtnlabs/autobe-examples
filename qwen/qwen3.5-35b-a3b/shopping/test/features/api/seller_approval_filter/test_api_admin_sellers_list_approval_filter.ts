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

export async function test_api_admin_sellers_list_approval_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  const adminAuthorizedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: adminAuth.token.access,
    },
  };
  // 2. Test filtering by each approvalStatus value
  // Filter for pending sellers
  const pendingFilter = await api.functional.ecommerceMall.admin.sellers.index(
    adminAuthorizedConnection,
    {
      body: {
        approvalStatus: "pending",
        limit: 100,
      } satisfies IEcommerceMallSeller.IRequest,
    },
  );
  typia.assert(pendingFilter);
  // Filter for approved sellers
  const approvedFilter = await api.functional.ecommerceMall.admin.sellers.index(
    adminAuthorizedConnection,
    {
      body: {
        approvalStatus: "approved",
        limit: 100,
      } satisfies IEcommerceMallSeller.IRequest,
    },
  );
  typia.assert(approvedFilter);
  // Filter for rejected sellers
  const rejectedFilter = await api.functional.ecommerceMall.admin.sellers.index(
    adminAuthorizedConnection,
    {
      body: {
        approvalStatus: "rejected",
        limit: 100,
      } satisfies IEcommerceMallSeller.IRequest,
    },
  );
  typia.assert(rejectedFilter);
  // 3. Validate that each filter returns only sellers with matching approval status
  TestValidator.equals(
    "pending filter returns sellers with pending status",
    pendingFilter.data.every((seller) => seller.approvalStatus === "pending"),
    true,
  );
  TestValidator.equals(
    "approved filter returns sellers with approved status",
    approvedFilter.data.every((seller) => seller.approvalStatus === "approved"),
    true,
  );
  TestValidator.equals(
    "rejected filter returns sellers with rejected status",
    rejectedFilter.data.every((seller) => seller.approvalStatus === "rejected"),
    true,
  );
  // 4. Validate pagination works correctly with filtered results
  TestValidator.equals(
    "pending pagination current page",
    pendingFilter.pagination.current,
    1,
  );
  TestValidator.equals(
    "pending pagination limit",
    pendingFilter.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "pending pagination records count",
    pendingFilter.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pending pagination pages count",
    pendingFilter.pagination.pages >= 0,
  );
  // 5. Validate that filtered records match data length
  TestValidator.equals(
    "pending records match data length",
    pendingFilter.pagination.records,
    pendingFilter.data.length,
  );
  TestValidator.equals(
    "approved records match data length",
    approvedFilter.pagination.records,
    approvedFilter.data.length,
  );
  TestValidator.equals(
    "rejected records match data length",
    rejectedFilter.pagination.records,
    rejectedFilter.data.length,
  );
  // 6. Validate seller summary structure in filtered results
  for (const seller of pendingFilter.data) {
    typia.assert(seller);
    TestValidator.predicate(
      "pending seller has valid approval status",
      seller.approvalStatus === "pending",
    );
  }
  for (const seller of approvedFilter.data) {
    typia.assert(seller);
    TestValidator.predicate(
      "approved seller has valid approval status",
      seller.approvalStatus === "approved",
    );
  }
  for (const seller of rejectedFilter.data) {
    typia.assert(seller);
    TestValidator.predicate(
      "rejected seller has valid approval status",
      seller.approvalStatus === "rejected",
    );
  }
}
