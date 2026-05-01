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

export async function test_api_admin_session_cross_admin_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create the first regular administrator account
  const firstAdminConnection: api.IConnection = { host: connection.host };
  const firstAdmin: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    firstAdminConnection,
    {},
  );
  typia.assert(firstAdmin);
  // 2. Create the second regular administrator account
  const secondAdminConnection: api.IConnection = { host: connection.host };
  const secondAdmin: IShoppingMallAdmin.IAuthorized =
    await authorize_admin_join(secondAdminConnection, {});
  typia.assert(secondAdmin);
  // 3. First admin attempts to list second admin's sessions → should be denied
  await TestValidator.error(
    "regular admin cannot access another admin's sessions",
    async () => {
      await api.functional.shoppingMall.admin.admins.sessions.index(
        firstAdminConnection,
        {
          adminId: secondAdmin.id,
          body: {} satisfies IShoppingMallAdminSession.IRequest,
        },
      );
    },
  );
  // 4. Second admin can list their own sessions → should succeed
  const ownSessions: IPageIShoppingMallAdminSession.ISummary =
    await api.functional.shoppingMall.admin.admins.sessions.index(
      secondAdminConnection,
      {
        adminId: secondAdmin.id,
        body: {} satisfies IShoppingMallAdminSession.IRequest,
      },
    );
  typia.assert(ownSessions);
}
