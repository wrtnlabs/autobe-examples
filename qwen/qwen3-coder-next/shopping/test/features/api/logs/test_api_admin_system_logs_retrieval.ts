import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSystematicLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSystematicLog";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSystematicLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystematicLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_system_logs_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Login as admin to get authorized connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<IShoppingMallAdmin.IJoin>(),
  });
  // 2. Retrieve system logs with pagination and filters
  const result = await api.functional.shoppingMall.admin.logs.index(
    adminConnection,
    {
      body: typia.random<IShoppingMallSystematicLog.IRequest>(),
    },
  );
  typia.assert(result);
  // 3. Validate response structure
  TestValidator.equals("pagination exists", result.pagination !== null, true);
  TestValidator.predicate("has data array", Array.isArray(result.data));
  TestValidator.equals(
    "pagination records matches data length",
    result.pagination.records,
    result.data.length,
  );
  // 4. Validate pagination metadata structure
  TestValidator.predicate(
    "current page is positive",
    result.pagination.current > 0,
  );
  TestValidator.predicate("limit is positive", result.pagination.limit > 0);
  TestValidator.predicate(
    "pages is non-negative",
    result.pagination.pages >= 0,
  );
}
