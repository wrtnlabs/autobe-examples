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

export async function test_api_feature_flag_environment_update_disable_feature(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await api.functional.communityPlatform.auth.admin.join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // 2. Create a feature flag
  const featureFlag =
    await api.functional.communityPlatform.admin.feature_flags.create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(1),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          flag_type: "percentage" as const,
          status: "active" as const,
          percentage_value: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<100>
          >(),
        } satisfies ICommunityPlatformFeatureFlag.ICreate,
      },
    );
  typia.assert(featureFlag);
  // 3. Create enabled environment configuration with rollout percentage
  const initialEnvConfig =
    await api.functional.communityPlatform.admin.feature_flags.environments.create(
      adminConnection,
      {
        featureFlagId: featureFlag.id satisfies string &
          tags.Format<"uuid"> as string,
        body: {
          is_enabled: true,
          rollout_percentage: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<100>
          >() satisfies number as number,
        } satisfies ICommunityPlatformFeatureFlagEnvironment.ICreate,
      },
    );
  typia.assert(initialEnvConfig);
  // 4. Update environment configuration to disable feature flag
  const updateBody = {
    is_enabled: false,
  } satisfies ICommunityPlatformFeatureFlagEnvironment.IUpdate;
  const updatedEnvConfig =
    await api.functional.communityPlatform.admin.feature_flags.environments.update(
      adminConnection,
      {
        featureFlagId: featureFlag.id satisfies string &
          tags.Format<"uuid"> as string,
        environmentId: initialEnvConfig.id satisfies string &
          tags.Format<"uuid"> as string,
        body: updateBody,
      },
    );
  typia.assert(updatedEnvConfig);
  // 5. Perform validation
  TestValidator.equals(
    "environment configuration id should remain unchanged",
    updatedEnvConfig.id,
    initialEnvConfig.id,
  );
  TestValidator.equals(
    "feature flag relationship should be maintained",
    updatedEnvConfig.feature_flag.id,
    featureFlag.id,
  );
  TestValidator.equals(
    "is_enabled should be false after update",
    updatedEnvConfig.is_enabled,
    false,
  );
  TestValidator.predicate(
    "rollout_percentage should be null or between 0-100 when disabled",
    () => {
      if (updatedEnvConfig.rollout_percentage === null) return true;
      return (
        typeof updatedEnvConfig.rollout_percentage === "number" &&
        updatedEnvConfig.rollout_percentage >= 0 &&
        updatedEnvConfig.rollout_percentage <= 100
      );
    },
  );
  TestValidator.predicate(
    "updated_at timestamp should be after created_at",
    () =>
      new Date(updatedEnvConfig.updated_at) >
      new Date(initialEnvConfig.created_at),
  );
  TestValidator.equals(
    "soft delete flag should be null for active configuration",
    updatedEnvConfig.deleted_at,
    null,
  );
}
