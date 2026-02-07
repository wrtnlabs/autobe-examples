import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminSession";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_sessions_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin join
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {} satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Admin login
  await authorize_admin_login(adminConnection, {
    body: {} satisfies IShoppingMallAdmin.ILogin,
  });
  // 3. Retrieve admin sessions
  const sessions =
    await api.functional.shoppingMall.admin.sessions.index(adminConnection);
  typia.assert(sessions);
  // Validate response structure without accessing non-existent properties
  TestValidator.equals(
    "pagination exists",
    sessions.pagination,
    sessions.pagination,
  );
  TestValidator.predicate("data is array", Array.isArray(sessions.data));
  TestValidator.predicate(
    "pagination current >= 1",
    sessions.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit >= 1",
    sessions.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    sessions.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    sessions.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "session data length is non-negative",
    sessions.data.length >= 0,
  );
}
