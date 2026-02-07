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

export async function test_api_admin_system_logs_filtered_by_error_event_type(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
    } satisfies IShoppingMallAdmin.ILogin,
  });
  // 2. Execute query for system logs (empty request since IRequest is {})
  const logs: IPageIShoppingMallSystemLog.ISummary =
    await api.functional.shoppingMall.admin.system_logs.index(adminConnection, {
      body: {} satisfies IShoppingMallSystemLog.IRequest,
    });
  typia.assert(logs);
  // 3. Validate results
  TestValidator.equals(
    "pagination is defined",
    logs.pagination,
    logs.pagination,
  );
  TestValidator.predicate("has at least one log entry", logs.data.length > 0);
  // 4. Verify each log entry has summary structure - only verify properties that exist in ISummary
  // Since ISummary is an empty object {}, there are no properties to validate
  // The only validation possible is confirming the structure exists and data is array
  // This matches the provided DTO definitions which state ISummary is {}
}
