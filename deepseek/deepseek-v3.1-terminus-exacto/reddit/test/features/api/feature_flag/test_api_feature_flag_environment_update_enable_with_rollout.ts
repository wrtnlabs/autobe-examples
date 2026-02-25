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

export async function test_api_feature_flag_environment_update_enable_with_rollout(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Create feature flag
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
  // 3. Create initial environment configuration (disabled)
  const initialEnvironment =
    await generate_random_community_platform_admin_feature_flags_environments_create(
      adminConnection,
      {
        body: {
          is_enabled: false,
          rollout_percentage: null,
        } satisfies ICommunityPlatformFeatureFlagEnvironment.ICreate,
        params: {
          featureFlagId: featureFlag.id,
        },
      },
    );
  typia.assert(initialEnvironment);
  // 4. Update environment configuration - enable with rollout percentage
  const rolloutPercentage = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<100>
  >();
  const updatedEnvironment =
    await api.functional.communityPlatform.admin.feature_flags.environments.update(
      adminConnection,
      {
        featureFlagId: featureFlag.id,
        environmentId: initialEnvironment.id,
        body: {
          is_enabled: true,
          rollout_percentage: rolloutPercentage,
        } satisfies ICommunityPlatformFeatureFlagEnvironment.IUpdate,
      },
    );
  typia.assert(updatedEnvironment);
  // 5. Validate the update
  TestValidator.equals(
    "environment should be enabled",
    updatedEnvironment.is_enabled,
    true,
  );
  TestValidator.equals(
    "rollout percentage should match",
    updatedEnvironment.rollout_percentage,
    rolloutPercentage,
  );
  TestValidator.equals(
    "feature flag ID should be maintained",
    updatedEnvironment.feature_flag.id,
    featureFlag.id,
  );
  TestValidator.predicate(
    "updated_at should be after created_at",
    new Date(updatedEnvironment.updated_at) >
      new Date(initialEnvironment.created_at),
  );
  TestValidator.notEquals(
    "updated_at should be different from initial",
    updatedEnvironment.updated_at,
    initialEnvironment.updated_at,
  );
  TestValidator.predicate(
    "rollout percentage should be within valid range",
    rolloutPercentage >= 0 && rolloutPercentage <= 100,
  );
}
