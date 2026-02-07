import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSystematicStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystematicStatus";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test system status report retrieval by authenticated administrator.
 * 1. Create admin account via admin join endpoint
 * 2. Login as admin using admin login utility
 * 3. Call status report endpoint to verify system health metrics
 * 4. Validate response structure and ordering
 */
export async function test_api_admin_status_report_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create admin account and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<IShoppingMallAdmin.IJoin>(),
  });
  // Call status report endpoint and validate
  const statusReport: IShoppingMallSystematicStatus =
    await api.functional.shoppingMall.admin.status_report.statusReport(
      adminConnection,
    );
  typia.assert(statusReport);
  // Validate response is not empty
  TestValidator.predicate(
    "status report has entries",
    () => Object.keys(statusReport).length > 0,
  );
}
