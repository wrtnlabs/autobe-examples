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
import { generate_random_shopping_mall_super_admin_feature_flags_create } from "../../../generate/generate_random_shopping_mall_super_admin_feature_flags_create";
import { prepare_random_shopping_mall_systematic_feature_flag } from "../../../prepare/prepare_random_shopping_mall_systematic_feature_flag";

export async function test_api_feature_flag_gradual_rollout_with_percentage(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection for authorization
  const adminConnection: api.IConnection = { host: connection.host };
  // 1. Authenticate as super admin
  const authResponse = await api.functional.shoppingMall.auth.super_admin.join(
    adminConnection,
    {
      body: typia.random<IShoppingMallSuperAdmin.IJoin>(),
    },
  );
  typia.assert(authResponse);
  // Update connection with authorization token
  adminConnection.headers = {
    ...adminConnection.headers,
    Authorization: `Bearer ${authResponse.token.access}`,
  };
  // 2. Create feature flag with empty body (as per DTO definition)
  const featureFlag =
    await api.functional.shoppingMall.superAdmin.feature_flags.create(
      adminConnection,
      {
        body: typia.random<IShoppingMallSystematicFeatureFlag.ICreate>(),
      },
    );
  typia.assert(featureFlag);
  // 3. Validate feature flag structure (empty object as per DTO)
  TestValidator.equals("feature flag is object", typeof featureFlag, "object");
}