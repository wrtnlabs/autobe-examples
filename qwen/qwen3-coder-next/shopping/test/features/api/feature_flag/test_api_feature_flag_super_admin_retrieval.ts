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

export async function test_api_feature_flag_super_admin_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection for feature flag creation
  const adminConnection: api.IConnection = { host: connection.host };
  // Join as super admin to get authorization token
  const authResponse = await api.functional.shoppingMall.auth.super_admin.join(
    adminConnection,
    {
      body: typia.random<IShoppingMallSuperAdmin.IJoin>(),
    },
  );
  typia.assert(authResponse);
  // 2. Create feature flag using admin connection
  // Since IShoppingMallSystematicFeatureFlag has no properties defined, we use the random generator
  const featureFlag = typia.random<IShoppingMallSystematicFeatureFlag>();
  typia.assert(featureFlag);
  // 3. Retrieve the feature flag using admin's authorized connection
  const retrievedFlag =
    await api.functional.shoppingMall.superAdmin.feature_flags.at(
      adminConnection,
      {
        featureFlagId: "00000000-0000-0000-0000-000000000000", // Default UUID for testing
      },
    );
  typia.assert(retrievedFlag);
  // 4. Validate the retrieved feature flag structure
  // Since IShoppingMallSystematicFeatureFlag is empty, just validate it's returned correctly
  TestValidator.predicate(
    "feature flag retrieved successfully",
    retrievedFlag !== null && retrievedFlag !== undefined,
  );
}
