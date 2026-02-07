import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_revenue_report(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {} satisfies IShoppingMallAdmin.IJoin,
  });
  // Retrieve revenue report
  const revenueReport = await api.functional.shoppingMall.admin.revenue.index(
    adminConnection,
    {
      body: {} satisfies IShoppingMallSnapshot.IRequest,
    },
  );
  typia.assert(revenueReport);
  // Validate pagination structure
  TestValidator.equals(
    "pagination structure",
    revenueReport.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit positive",
    revenueReport.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    revenueReport.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    revenueReport.pagination.pages >= 0,
  );
  // Validate that snapshots are present
  TestValidator.predicate(
    "has at least one snapshot",
    revenueReport.data.length > 0,
  );
  // Validate each snapshot has required structure (IShoppingMallSnapshot is empty object)
  for (const snapshot of revenueReport.data) {
    TestValidator.predicate(
      "snapshot is object",
      typeof snapshot === "object" && snapshot !== null,
    );
  }
}
