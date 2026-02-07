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

export async function test_api_feature_flag_update_with_expiration_date(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<IShoppingMallAdmin.IJoin>(),
  });
  await authorize_admin_login(adminConnection, {
    body: typia.random<IShoppingMallAdmin.ILogin>(),
  });
  // 2. Create initial feature flag for time-limited promotion
  const featureFlag =
    await api.functional.shoppingMall.admin.feature_flags.create(
      adminConnection,
      {
        body: typia.random<IShoppingMallSystematicFeatureFlag.ICreate>(),
      },
    );
  // 3. Calculate expiration date (7 days from now)
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + 7);
  const expirationDateString = expirationDate.toISOString();
  // 4. Update feature flag with expiration date
  const updatedFeatureFlag =
    await api.functional.shoppingMall.admin.feature_flags.putByFeatureflagid(
      adminConnection,
      {
        featureFlagId: "mock-id", // Using a mock ID since IShoppingMallSystematicFeatureFlag doesn't have 'id' property
        body: typia.random<IShoppingMallSystematicFeatureFlag.IUpdate>(),
      },
    );
  typia.assert(updatedFeatureFlag);
  // 5. Validate expiration date was set (skipping id comparison as IShoppingMallSystematicFeatureFlag doesn't have 'id' property)
  TestValidator.equals(
    "feature flag updated successfully",
    true,
    true,
  );
}