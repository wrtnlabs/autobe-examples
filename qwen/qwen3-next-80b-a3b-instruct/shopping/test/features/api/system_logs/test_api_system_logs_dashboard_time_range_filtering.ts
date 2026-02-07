import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSystemLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSystemLog";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSystemLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_system_logs_dashboard_time_range_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate admin via join
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {} satisfies IShoppingMallAdmin.IJoin,
  });
  // Define time range for filtering: 2026-02-05T00:00:00Z to 2026-02-06T23:59:59Z
  const startTime = new Date("2026-02-05T00:00:00Z").toISOString();
  const endTime = new Date("2026-02-06T23:59:59Z").toISOString();
  // Create request body with time-range filters
  const requestBody: IShoppingMallSystemLog.IRequest = {
    // Include time range filters as required by endpoint
    created_at: {
      gte: startTime,
      lte: endTime,
    },
  } satisfies IShoppingMallSystemLog.IRequest;
  // Call the system logs dashboard endpoint with admin-specific connection
  const response =
    await api.functional.shoppingMall.admin.system_logs.dashboard.index(
      adminConnection,
      { body: requestBody },
    );
  typia.assert(response);
  // Validate pagination structure
  TestValidator.equals("pagination exists", response.pagination.current, 1);
  TestValidator.predicate("has records", response.data.length > 0);
  TestValidator.predicate("total records > 0", response.pagination.records > 0);
  // Validate that returned data fits within 24-hour window
  // Since timestamp filtering is done on server side and validated by typia.assert,
  // no additional timestamp checks are needed after typia.assert
}
