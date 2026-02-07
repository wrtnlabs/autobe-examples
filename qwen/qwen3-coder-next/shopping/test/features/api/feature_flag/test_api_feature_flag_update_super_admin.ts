import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import type { IShoppingMallSystematicFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystematicFeatureFlag";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_feature_flag_update_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate as super admin
  const adminConnection: api.IConnection = { host: connection.host };
  // Step 1: Join as super admin first
  await api.functional.shoppingMall.auth.super_admin.join(adminConnection, {
    body: typia.random<IShoppingMallSuperAdmin.IJoin>(),
  });
  // Step 2: Login as super admin to establish session
  const authResponse = await api.functional.shoppingMall.auth.super_admin.login(
    adminConnection,
    {
      body: typia.random<IShoppingMallSuperAdmin.ILogin>(),
    },
  );
  // Update the connection with the auth token
  adminConnection.headers = {
    ...adminConnection.headers,
    Authorization: authResponse.token.access,
  };
  // Step 3: Update feature flag configuration
  const updatedFeatureFlag =
    await api.functional.shoppingMall.superAdmin.feature_flags.patch(
      adminConnection,
      {
        body: typia.random<IShoppingMallSystematicFeatureFlag.IUpdate>(),
      },
    );
  // Step 4: Validate the response
  typia.assert(updatedFeatureFlag);
}
