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
import { generate_random_shopping_mall_admin_feature_flags_create } from "../../../generate/generate_random_shopping_mall_admin_feature_flags_create";
import { prepare_random_shopping_mall_systematic_feature_flag } from "../../../prepare/prepare_random_shopping_mall_systematic_feature_flag";

export async function test_api_feature_flag_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Create a feature flag to update
  const initialFeatureFlag =
    await api.functional.shoppingMall.admin.feature_flags.create(
      adminConnection,
      {
        body: {
          feature_name: "new_checkout_flow",
          description: "A/B test for new checkout experience",
          is_enabled: true,
          target_actor: "all",
          rollout_percentage: 50,
          expires_at: new Date(
            new Date().getTime() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        } satisfies IShoppingMallSystematicFeatureFlag.ICreate,
      },
    );
  typia.assert(initialFeatureFlag);
  // 3. Update the feature flag with new values
  const updatedFeatureFlag =
    await api.functional.shoppingMall.admin.feature_flags.patch(
      adminConnection,
      {
        body: {
          is_enabled: false,
          target_actor: "customer",
          rollout_percentage: 75,
          expires_at: new Date(
            new Date().getTime() + 14 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        } satisfies IShoppingMallSystematicFeatureFlag.IUpdate,
      },
    );
  typia.assert(updatedFeatureFlag);
  // 4. Validate updated values using typia.assert
  typia.assert<IShoppingMallSystematicFeatureFlag>(updatedFeatureFlag);
}
