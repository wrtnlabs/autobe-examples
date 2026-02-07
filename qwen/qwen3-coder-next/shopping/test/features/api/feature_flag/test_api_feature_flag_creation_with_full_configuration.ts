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

export async function test_api_feature_flag_creation_with_full_configuration(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_login(superAdminConnection, {
    body: typia.random<IShoppingMallSuperAdmin.IJoin>(),
  });
  // Step 2: Create feature flag with complete configuration
  const featureFlag =
    await api.functional.shoppingMall.superAdmin.feature_flags.create(
      superAdminConnection,
      {
        body: typia.random<IShoppingMallSystematicFeatureFlag.ICreate>(),
      },
    );
  typia.assert(featureFlag);
  // Step 3: Validate feature flag structure
  // Since IShoppingMallSystematicFeatureFlag is empty in DTO, no specific properties to validate
  // The test validates that feature flag creation works and returns valid data
}
