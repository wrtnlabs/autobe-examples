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

export async function test_api_admin_sellers_list_basic(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account for authentication
  const adminAuthConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminAuthConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create admin-specific connection with token
  const adminConnection: api.IConnection = { host: connection.host };
  adminConnection.headers = {
    Authorization: adminAuth.token.access,
  };
  // 3. Fetch sellers list with default pagination
  const sellersPage = await api.functional.ecommerceMall.admin.sellers.index(
    adminConnection,
    {
      body: typia.random<IEcommerceMallSeller.IRequest>(),
    },
  );
  typia.assert(sellersPage);
  // 4. Validate pagination structure
  TestValidator.predicate(
    "pagination exists",
    sellersPage.pagination !== undefined,
  );
  TestValidator.predicate(
    "pagination.current is valid",
    sellersPage.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination.limit is valid",
    sellersPage.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination.records is non-negative",
    sellersPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages is valid",
    sellersPage.pagination.pages >= 0,
  );
  // 5. Validate seller summary fields
  if (sellersPage.data.length > 0) {
    const firstSeller = sellersPage.data[0];
    typia.assert(firstSeller);
    // Validate UUID format
    typia.assert<string & tags.Format<"uuid">>(firstSeller.id);
    // Validate email format
    typia.assert<string & tags.Format<"email">>(firstSeller.email);
    // Validate approvalStatus is one of the allowed values
    const allowedApprovalStatuses = [
      "pending",
      "approved",
      "rejected",
    ] as const;
    TestValidator.predicate(
      "approvalStatus is valid",
      allowedApprovalStatuses.includes(firstSeller.approvalStatus),
    );
    // Validate boolean fields
    TestValidator.predicate(
      "isSuspended is boolean",
      typeof firstSeller.isSuspended === "boolean",
    );
    TestValidator.predicate(
      "isBanned is boolean",
      typeof firstSeller.isBanned === "boolean",
    );
    // Validate date-time formats
    typia.assert<string & tags.Format<"date-time">>(firstSeller.createdAt);
    typia.assert<string & tags.Format<"date-time">>(firstSeller.updatedAt);
  }
}