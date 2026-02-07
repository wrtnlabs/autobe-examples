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

export async function test_api_feature_flag_rollout_percentage_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<IShoppingMallAdmin.IJoin>(),
  });
  // 2. Create feature flag
  const featureFlag =
    await api.functional.shoppingMall.admin.feature_flags.create(
      adminConnection,
      {
        body: typia.random<IShoppingMallSystematicFeatureFlag.ICreate>(),
      },
    );
  typia.assert(featureFlag);
  // 3. Test valid rollout percentages at boundaries
  // 3.1 Test rollout percentage 0
  const updatedFlag0 =
    await api.functional.shoppingMall.admin.feature_flags.patch(
      adminConnection,
      {
        body: {
          rollout_percentage: 0,
        } satisfies IShoppingMallSystematicFeatureFlag.IUpdate,
      },
    );
  typia.assert(updatedFlag0);
  // 3.2 Test rollout percentage 100
  const updatedFlag100 =
    await api.functional.shoppingMall.admin.feature_flags.patch(
      adminConnection,
      {
        body: {
          rollout_percentage: 100,
        } satisfies IShoppingMallSystematicFeatureFlag.IUpdate,
      },
    );
  typia.assert(updatedFlag100);
  // 4. Test invalid rollout percentages outside 0-100 range
  // 4.1 Test negative rollout percentage
  await TestValidator.error("negative rollout percentage", async () => {
    await api.functional.shoppingMall.admin.feature_flags.patch(
      adminConnection,
      {
        body: {
          rollout_percentage: -1,
        } satisfies IShoppingMallSystematicFeatureFlag.IUpdate,
      },
    );
  });
  // 4.2 Test rollout percentage over 100
  await TestValidator.error("rollout percentage over 100", async () => {
    await api.functional.shoppingMall.admin.feature_flags.patch(
      adminConnection,
      {
        body: {
          rollout_percentage: 101,
        } satisfies IShoppingMallSystematicFeatureFlag.IUpdate,
      },
    );
  });
}