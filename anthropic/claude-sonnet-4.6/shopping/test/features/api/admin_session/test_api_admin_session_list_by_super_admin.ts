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

export async function test_api_admin_session_list_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuthorized = await authorize_super_admin_join(
    superAdminConnection,
    {},
  );
  typia.assert(superAdminAuthorized);
  // Step 2: Register a new regular administrator (automatically creates a session record)
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {});
  typia.assert(adminAuthorized);
  // The admin's ID to query sessions for
  const adminId = adminAuthorized.id;
  // Step 3: As super admin, retrieve the session list for the regular admin
  const sessionPage =
    await api.functional.shoppingMall.superAdmin.admins.sessions.index(
      superAdminConnection,
      {
        adminId,
        body: {} satisfies IShoppingMallAdminSession.IRequest,
      },
    );
  typia.assert(sessionPage);
  // Step 4: Validate pagination metadata
  TestValidator.predicate(
    "pagination records >= 1",
    sessionPage.pagination.records >= 1,
  );
  TestValidator.predicate(
    "data has at least one session",
    sessionPage.data.length >= 1,
  );
  TestValidator.predicate(
    "pagination current >= 1",
    sessionPage.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit >= 1",
    sessionPage.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination pages >= 1",
    sessionPage.pagination.pages >= 1,
  );
  // Step 5: Validate the session created at join time is active
  const activeSession = sessionPage.data.find((s) => s.isActive === true);
  TestValidator.predicate(
    "at least one active session exists",
    activeSession !== undefined,
  );
}
