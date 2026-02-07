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

export async function test_api_feature_flag_super_admin_update(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connections
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Step 1: Register and login as super admin
  await api.functional.shoppingMall.auth.super_admin.join(
    superAdminConnection,
    {
      body: typia.random<IShoppingMallSuperAdmin.IJoin>(),
    },
  );
  // Step 2: Generate test data for feature flag update
  const featureFlagId = typia.random<string & tags.Format<"uuid">>();
  const updateBody: IShoppingMallSystematicFeatureFlag.IUpdate = {
    description: RandomGenerator.paragraph({ sentences: 2 }),
    is_enabled: true,
    target_actor: "customer" as const,
    rollout_percentage: typia.random<number & tags.Type<"uint32"> & tags.Maximum<100>>(),
    expires_at: new Date(
      new Date().getTime() + 365 * 24 * 60 * 60 * 1000,
    ).toISOString(),
  };
  // Step 3: Update the feature flag
  const updatedFeatureFlag =
    await api.functional.shoppingMall.superAdmin.feature_flags.putByFeatureflagid(
      superAdminConnection,
      {
        featureFlagId,
        body: updateBody,
      },
    );
  typia.assert(updatedFeatureFlag);
  // Step 4: Validate the update was successful
  TestValidator.predicate(
    "feature flag updated successfully",
    updatedFeatureFlag !== null,
  );
}