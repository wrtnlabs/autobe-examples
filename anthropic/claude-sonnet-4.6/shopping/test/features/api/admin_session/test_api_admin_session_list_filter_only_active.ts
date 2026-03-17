import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminSession";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfCustomer";
import type { IShoppingMallAdminOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfSeller";
import type { IShoppingMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSession";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_admin_session_list_filter_only_active(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a super administrator and get their connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Register a regular administrator (creates an active session)
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {});
  typia.assert(adminAuthorized);
  const adminId = adminAuthorized.id;
  // 3. Call sessions endpoint with onlyActive: true
  const activeSessionsResult =
    await api.functional.shoppingMall.superAdmin.admins.sessions.index(
      superAdminConnection,
      {
        adminId,
        body: {
          onlyActive: true,
        } satisfies IShoppingMallAdminSession.IRequest,
      },
    );
  typia.assert(activeSessionsResult);
  // Validate all returned sessions have isActive === true
  for (const session of activeSessionsResult.data) {
    TestValidator.predicate(
      "session with onlyActive filter must be active",
      session.isActive === true,
    );
  }
  // Validate pagination metadata consistency
  TestValidator.predicate(
    "pagination records matches data length (active)",
    activeSessionsResult.data.length <= activeSessionsResult.pagination.limit,
  );
  TestValidator.predicate(
    "pagination current page >= 1 (active)",
    activeSessionsResult.pagination.current >= 1,
  );
  // 4. Call sessions endpoint without onlyActive filter (all sessions)
  const allSessionsResult =
    await api.functional.shoppingMall.superAdmin.admins.sessions.index(
      superAdminConnection,
      {
        adminId,
        body: {} satisfies IShoppingMallAdminSession.IRequest,
      },
    );
  typia.assert(allSessionsResult);
  // Validate pagination metadata consistency for all sessions
  TestValidator.predicate(
    "pagination records matches data length (all)",
    allSessionsResult.data.length <= allSessionsResult.pagination.limit,
  );
  TestValidator.predicate(
    "pagination current page >= 1 (all)",
    allSessionsResult.pagination.current >= 1,
  );
  // 5. Validate filter correctness: all sessions records >= active sessions records
  TestValidator.predicate(
    "all sessions count >= active sessions count",
    allSessionsResult.pagination.records >=
      activeSessionsResult.pagination.records,
  );
}
