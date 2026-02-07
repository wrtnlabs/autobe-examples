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

export async function test_api_feature_flag_expiration_date_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authorize
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<IShoppingMallAdmin.IJoin>(),
  });
  // 2. Create a feature flag to update
  const featureFlag =
    await api.functional.shoppingMall.admin.feature_flags.create(
      adminConnection,
      {
        body: {
          feature_name: "new_checkout_flow",
          description: "Updated checkout experience",
          is_enabled: true,
          target_actor: "user",
          rollout_percentage: 50,
        } satisfies IShoppingMallSystematicFeatureFlag.ICreate,
      },
    );
  typia.assert(featureFlag);
  // 3. Test updating feature flag with future expiration date
  const futureDate = new Date();
  futureDate.setFullYear(futureDate.getFullYear() + 1);
  const updatedFeatureFlag =
    await api.functional.shoppingMall.admin.feature_flags.patch(
      adminConnection,
      {
        body: {
          expires_at: futureDate.toISOString(),
        } satisfies IShoppingMallSystematicFeatureFlag.IUpdate,
      },
    );
  typia.assert(updatedFeatureFlag);
  TestValidator.equals(
    "expires_at is set",
    (updatedFeatureFlag as any).expires_at,
    futureDate.toISOString(),
  );
  // 4. Test updating feature flag without expiration date (clearing it)
  const noExpirationFlag =
    await api.functional.shoppingMall.admin.feature_flags.patch(
      adminConnection,
      {
        body: {
          expires_at: null,
        } satisfies IShoppingMallSystematicFeatureFlag.IUpdate,
      },
    );
  typia.assert(noExpirationFlag);
  TestValidator.equals("expires_at is null", (noExpirationFlag as any).expires_at, null);
}