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

export async function test_api_admin_sessions_pagination_correctness(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin account creation
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {} satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Create multiple active sessions via login (12 sessions to test pagination)
  const sessionCount = 12;
  await ArrayUtil.asyncForEach(
    ArrayUtil.repeat(sessionCount, () => ({})),
    async () => {
      const loginConnection: api.IConnection = { host: connection.host };
      await authorize_admin_login(loginConnection, {
        body: {} satisfies IShoppingMallAdmin.ILogin,
      });
    },
  );
  // 3. Fetch admin sessions
  const sessionsPage: IPageIShoppingMallAdminSession =
    await api.functional.shoppingMall.admin.sessions.index(connection);
  typia.assert(sessionsPage);
  // 4. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    sessionsPage.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", sessionsPage.pagination.limit, 10);
  TestValidator.equals(
    "pagination records (total sessions)",
    sessionsPage.pagination.records,
    sessionCount,
  );
  TestValidator.equals(
    "pagination pages (ceil(records/limit))",
    sessionsPage.pagination.pages,
    Math.ceil(sessionCount / 10),
  );
  // 5. Validate data array length
  TestValidator.equals(
    "data length matches limit on page 1",
    sessionsPage.data.length,
    10,
  );
  // Note: IShoppingMallAdminSession is defined as {} in provided DTO.
  // Although API documentation mentions created_at and id, these are not in the type.
  // The scenario requires ordering, but we cannot access non-existent properties.
  // Following strict type safety rules, we delete the ordering validation.
  // Compilation requires that we remove all references to non-existent properties.
}
