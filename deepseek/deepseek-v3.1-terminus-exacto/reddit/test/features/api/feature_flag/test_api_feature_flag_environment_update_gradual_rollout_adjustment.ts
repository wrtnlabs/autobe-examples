import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlag";
import type { ICommunityPlatformFeatureFlagEnvironment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlagEnvironment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_community_platform_admin_feature_flags_create } from "../../../generate/generate_random_community_platform_admin_feature_flags_create";
import { generate_random_community_platform_admin_feature_flags_environments_create } from "../../../generate/generate_random_community_platform_admin_feature_flags_environments_create";
import { prepare_random_community_platform_feature_flag } from "../../../prepare/prepare_random_community_platform_feature_flag";
import { prepare_random_community_platform_feature_flag_environment } from "../../../prepare/prepare_random_community_platform_feature_flag_environment";

export async function test_api_feature_flag_environment_update_gradual_rollout_adjustment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // 2. Create a feature flag with percentage type
  const featureFlag =
    await generate_random_community_platform_admin_feature_flags_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          flag_type: "percentage",
          status: "active",
          percentage_value: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<100>
          >(),
        } satisfies ICommunityPlatformFeatureFlag.ICreate,
      },
    );
  typia.assert(featureFlag);
  // 3. Create initial environment configuration
  const initialEnvironment =
    await generate_random_community_platform_admin_feature_flags_environments_create(
      adminConnection,
      {
        body: {
          is_enabled: true,
          rollout_percentage: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<100>
          >(),
        } satisfies ICommunityPlatformFeatureFlagEnvironment.ICreate,
        params: {
          featureFlagId: featureFlag.id,
        },
      },
    );
  typia.assert(initialEnvironment);
  // 4. Test updating rollout percentage to 0% (effectively disabling)
  const updateZero =
    await api.functional.communityPlatform.admin.feature_flags.environments.update(
      adminConnection,
      {
        featureFlagId: featureFlag.id,
        environmentId: initialEnvironment.id,
        body: {
          is_enabled: true,
          rollout_percentage: 0,
        } satisfies ICommunityPlatformFeatureFlagEnvironment.IUpdate,
      },
    );
  typia.assert(updateZero);
  TestValidator.equals(
    "rollout percentage should be 0",
    updateZero.rollout_percentage,
    0,
  );
  TestValidator.predicate(
    "feature flag should remain enabled",
    updateZero.is_enabled,
  );
  // 5. Test updating rollout percentage to 100% (full rollout)
  const updateFull =
    await api.functional.communityPlatform.admin.feature_flags.environments.update(
      adminConnection,
      {
        featureFlagId: featureFlag.id,
        environmentId: initialEnvironment.id,
        body: {
          is_enabled: true,
          rollout_percentage: 100,
        } satisfies ICommunityPlatformFeatureFlagEnvironment.IUpdate,
      },
    );
  typia.assert(updateFull);
  TestValidator.equals(
    "rollout percentage should be 100",
    updateFull.rollout_percentage,
    100,
  );
  TestValidator.predicate(
    "feature flag should remain enabled",
    updateFull.is_enabled,
  );
  // 6. Test updating rollout percentage to intermediate value
  const intermediateValue = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<99>
  >();
  const updateIntermediate =
    await api.functional.communityPlatform.admin.feature_flags.environments.update(
      adminConnection,
      {
        featureFlagId: featureFlag.id,
        environmentId: initialEnvironment.id,
        body: {
          is_enabled: true,
          rollout_percentage: intermediateValue,
        } satisfies ICommunityPlatformFeatureFlagEnvironment.IUpdate,
      },
    );
  typia.assert(updateIntermediate);
  TestValidator.equals(
    "rollout percentage should match intermediate value",
    updateIntermediate.rollout_percentage,
    intermediateValue,
  );
  TestValidator.predicate(
    "feature flag should remain enabled",
    updateIntermediate.is_enabled,
  );
  // 7. Test updating only rollout percentage without changing enabled status
  const newRolloutPercentage = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<100>
  >();
  const updateRolloutOnly =
    await api.functional.communityPlatform.admin.feature_flags.environments.update(
      adminConnection,
      {
        featureFlagId: featureFlag.id,
        environmentId: initialEnvironment.id,
        body: {
          rollout_percentage: newRolloutPercentage,
        } satisfies ICommunityPlatformFeatureFlagEnvironment.IUpdate,
      },
    );
  typia.assert(updateRolloutOnly);
  TestValidator.equals(
    "rollout percentage should be updated",
    updateRolloutOnly.rollout_percentage,
    newRolloutPercentage,
  );
  TestValidator.predicate(
    "enabled status should remain unchanged",
    updateRolloutOnly.is_enabled,
  );
  // 8. Test updating only enabled status without changing rollout percentage
  const updateEnabledOnly =
    await api.functional.communityPlatform.admin.feature_flags.environments.update(
      adminConnection,
      {
        featureFlagId: featureFlag.id,
        environmentId: initialEnvironment.id,
        body: {
          is_enabled: false,
        } satisfies ICommunityPlatformFeatureFlagEnvironment.IUpdate,
      },
    );
  typia.assert(updateEnabledOnly);
  TestValidator.predicate(
    "enabled status should be false",
    !updateEnabledOnly.is_enabled,
  );
  TestValidator.equals(
    "rollout percentage should remain unchanged",
    updateEnabledOnly.rollout_percentage,
    newRolloutPercentage,
  );
}
