import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
export async function test_api_superadmin_profile_access_denied_without_auth(
  connection: api.IConnection,
) {
  // Convert base connection to unauthenticated connection (no JWT token)
  const unauthConnection: api.IConnection = { host: connection.host };
  // Attempt to access superAdmin profile endpoint without authentication
  // This should fail with 401 Unauthorized
  await TestValidator.error(
    "superAdmin profile access without auth should be denied",
    async () => {
      await api.functional.shoppingMall.superAdmin.superAdmins.me.at(
        unauthConnection,
      );
    },
  );
}
