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

export async function test_api_feature_flag_admin_deletion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection by joining as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<IShoppingMallAdmin.IJoin>(),
  });
  // 2. Create a feature flag (use it for authorization context)
  await api.functional.shoppingMall.admin.feature_flags.create(
    adminConnection,
    {
      body: typia.random<IShoppingMallSystematicFeatureFlag.ICreate>(),
    },
  );
  // 3. Delete a feature flag using a generated UUID
  const featureFlagId = typia.random<string & tags.Format<"uuid">>();
  await api.functional.shoppingMall.admin.feature_flags.erase(adminConnection, {
    featureFlagId,
  });
  // 4. Verify the deletion completed without error
  // The erase function returns void on success, so we verify the operation
  // completed without throwing an error by reaching this point
}
