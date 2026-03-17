import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_admin_session_detail_mismatched_admin_session_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register super administrator and set up superAdmin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Register first regular administrator (adminA)
  const adminAConnection: api.IConnection = { host: connection.host };
  const adminAAuthorized = await authorize_admin_join(adminAConnection, {});
  typia.assert(adminAAuthorized);
  const adminAId = adminAAuthorized.id;
  // 3. Register second regular administrator (adminB)
  const adminBConnection: api.IConnection = { host: connection.host };
  const adminBAuthorized = await authorize_admin_join(adminBConnection, {});
  typia.assert(adminBAuthorized);
  const adminBId = adminBAuthorized.id;
  // 4. Attempt to retrieve a session using adminB's adminId paired with adminA's id
  // (used as a fake sessionId). This creates an intentional mismatch:
  // - adminA's admin UUID is NOT a session record belonging to adminB
  // - The server must enforce that the session belongs to the specified admin
  // - Expected result: 404 Not Found
  await TestValidator.httpError(
    "mismatched admin session should be rejected with 404",
    404,
    async () => {
      await api.functional.shoppingMall.superAdmin.admins.sessions.at(
        superAdminConnection,
        {
          adminId: adminBId,
          sessionId: adminAId, // adminA's id is definitely NOT a session of adminB
        },
      );
    },
  );
}
