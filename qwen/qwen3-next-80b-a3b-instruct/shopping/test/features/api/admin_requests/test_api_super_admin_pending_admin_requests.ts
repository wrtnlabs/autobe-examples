import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdminPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminPasswordReset";
import type { IShoppingMallAdminPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPasswordReset";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
export async function test_api_super_admin_pending_admin_requests(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as super administrator
  const superAdminEmail = typia.random<string & tags.Format<"email">>();
  const superAdminPassword = RandomGenerator.alphaNumeric(16);
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin: IShoppingMallSuperAdmin.IAuthorized =
    await authorize_super_admin_join(superAdminConnection, {
      body: {
        email: superAdminEmail,
        password: superAdminPassword,
      },
    });
  typia.assert(superAdmin);
  // Step 2: Use super admin connection to retrieve pending admin requests
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_login(adminConnection, {
    body: {
      email: superAdminEmail,
      password: superAdminPassword,
    },
  });
  const response =
    await api.functional.shoppingMall.superAdmin.admins.requests.index(
      adminConnection,
    );
  typia.assert(response);
  // Step 3: Validate unauthorized access fails with 401
  // Use base connection (no auth) to test authorization rejection
  await TestValidator.error("unauthenticated user gets 401", async () => {
    await api.functional.shoppingMall.superAdmin.admins.requests.index(
      connection,
    );
  });
}
