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

export async function test_api_feature_flag_boundary_rollout_percentages(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for super admin authentication
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Step 1: Super admin joins to create account
  const joinResponse = await api.functional.shoppingMall.auth.super_admin.join(
    superAdminConnection,
    {
      body: typia.random<IShoppingMallSuperAdmin.IJoin>(),
    },
  );
  typia.assert(joinResponse);
  // Step 2: Super admin logs in to get authentication tokens
  const loginResponse =
    await api.functional.shoppingMall.auth.super_admin.login(
      superAdminConnection,
      {
        body: typia.random<IShoppingMallSuperAdmin.ILogin>(),
      },
    );
  typia.assert(loginResponse);
  // Update connection with authentication token from login
  superAdminConnection.headers = {
    ...superAdminConnection.headers,
    Authorization: loginResponse.token.access,
  };
  // Step 3: Test feature flag update with rollout_percentage = 0 (disabled)
  const disabledFeature =
    await api.functional.shoppingMall.superAdmin.feature_flags.patch(
      superAdminConnection,
      {
        body: {
          rollout_percentage: 0,
        } satisfies IShoppingMallSystematicFeatureFlag.IUpdate,
      },
    );
  typia.assert(disabledFeature);
  // Step 4: Test feature flag update with rollout_percentage = 100 (enabled)
  const enabledFeature =
    await api.functional.shoppingMall.superAdmin.feature_flags.patch(
      superAdminConnection,
      {
        body: {
          rollout_percentage: 100,
        } satisfies IShoppingMallSystematicFeatureFlag.IUpdate,
      },
    );
  typia.assert(enabledFeature);
}
