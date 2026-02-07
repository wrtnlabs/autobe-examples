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

export async function test_api_admin_system_logs_cursor_pagination_successive_pages(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {} satisfies IShoppingMallAdmin.IJoin,
  });
  // Fetch first page of system logs
  const firstPage: IPageIShoppingMallSystemLog.ISummary =
    await api.functional.shoppingMall.admin.system_logs.index(adminConnection, {
      body: {} satisfies IShoppingMallSystemLog.IRequest,
    });
  typia.assert(firstPage);
  // Validate first page structure
  TestValidator.equals(
    "first page pagination exists",
    firstPage.pagination,
    firstPage.pagination,
  );
  TestValidator.predicate("first page has data", firstPage.data.length > 0);
  TestValidator.equals("first page is page 1", firstPage.pagination.current, 1);
  // Fetch second page of system logs (same request body)
  const secondPage: IPageIShoppingMallSystemLog.ISummary =
    await api.functional.shoppingMall.admin.system_logs.index(adminConnection, {
      body: {} satisfies IShoppingMallSystemLog.IRequest,
    });
  typia.assert(secondPage);
  // Validate second page structure
  TestValidator.equals(
    "second page pagination exists",
    secondPage.pagination,
    secondPage.pagination,
  );
  TestValidator.predicate("second page has data", secondPage.data.length > 0);
  TestValidator.equals(
    "second page is page 2",
    secondPage.pagination.current,
    2,
  );
  TestValidator.equals(
    "total records unchanged",
    secondPage.pagination.records,
    firstPage.pagination.records,
  );
  // Verify data between pages is different (no repeated entries)
  TestValidator.notEquals(
    "data differs between consecutive pages",
    firstPage.data,
    secondPage.data,
  );
}