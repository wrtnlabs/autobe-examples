import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdminAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminAction";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminAction";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_seller_approval_review_30_days(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication using register (only available method with defined schema)
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {} satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Fetch admin actions report with empty request body (IRequest is empty object)
  const report =
    await api.functional.shoppingMall.admin.admin_actions.report.index(
      adminConnection,
      {
        body: {} satisfies IShoppingMallAdminAction.IRequest,
      },
    );
  typia.assert(report);
  // 3. Validate minimal structure since ISummary is empty object
  TestValidator.equals(
    "pagination is present",
    typeof report.pagination,
    "object",
  );
  TestValidator.equals("data is array", Array.isArray(report.data), true);
  TestValidator.predicate("has at least one record", report.data.length > 0);
  // Cannot validate specific actions because ISummary has no defined properties
}
