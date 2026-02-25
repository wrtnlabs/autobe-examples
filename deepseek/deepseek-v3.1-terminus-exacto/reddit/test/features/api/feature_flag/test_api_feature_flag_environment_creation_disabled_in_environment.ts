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

export async function test_api_feature_flag_environment_creation_disabled_in_environment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication with isolated connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // 2. Create active user_specific feature flag (no boolean/percentage values)
  const featureFlag =
    await generate_random_community_platform_admin_feature_flags_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          flag_type: "user_specific",
          status: "active",
          boolean_value: null,
          percentage_value: null,
        } satisfies ICommunityPlatformFeatureFlag.ICreate,
      },
    );
  typia.assert(featureFlag);
  // 3. Create environment configuration with explicit disabled status
  const environment =
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
  typia.assert(environment);
  // 4. Validate environment-specific override logic
  TestValidator.equals(
    "environment should be explicitly disabled",
    environment.is_enabled,
    false,
  );
  TestValidator.equals(
    "rollout percentage should be null for disabled environment",
    environment.rollout_percentage,
    null,
  );
  // 5. Validate feature flag linkage and active status
  TestValidator.equals(
    "environment should reference correct feature flag",
    environment.feature_flag.id,
    featureFlag.id,
  );
  TestValidator.equals(
    "feature flag should remain active despite disabled environment",
    environment.feature_flag.status,
    "active",
  );
  TestValidator.equals(
    "feature flag type should be preserved",
    environment.feature_flag.flag_type,
    "user_specific",
  );
  TestValidator.equals(
    "user_specific flag should have null boolean value",
    environment.feature_flag.boolean_value,
    null,
  );
  TestValidator.equals(
    "user_specific flag should have null percentage value",
    environment.feature_flag.percentage_value,
    null,
  );
}
