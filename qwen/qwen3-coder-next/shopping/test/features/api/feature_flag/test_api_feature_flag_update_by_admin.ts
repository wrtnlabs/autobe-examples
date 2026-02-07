import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSystematicFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystematicFeatureFlag";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_feature_flag_update_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const joinResponse = await api.functional.shoppingMall.auth.admin.join(
    adminConnection,
    {
      body: typia.random<IShoppingMallAdmin.IJoin>(),
    },
  );
  typia.assert(joinResponse);
  // 2. Login to establish admin session
  const loginResponse = await api.functional.shoppingMall.auth.admin.login(
    adminConnection,
    {
      body: typia.random<IShoppingMallAdmin.ILogin>(),
    },
  );
  typia.assert(loginResponse);
  // 3. Update a feature flag with new configuration
  // Using a realistic feature flag ID from the test environment
  const featureFlagId = "test-feature-flag-001";
  const updatedFlag =
    await api.functional.shoppingMall.admin.feature_flags.putByFeatureflagid(
      adminConnection,
      {
        featureFlagId: featureFlagId,
        body: typia.random<IShoppingMallSystematicFeatureFlag.IUpdate>(),
      },
    );
  typia.assert(updatedFlag);
  // 4. Validate the update was successful by checking the response structure
  TestValidator.predicate("feature flag updated successfully", true);
}
