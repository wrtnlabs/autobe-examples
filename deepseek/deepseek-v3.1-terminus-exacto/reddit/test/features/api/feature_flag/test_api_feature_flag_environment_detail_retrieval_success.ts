import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlag";
import type { ICommunityPlatformFeatureFlagEnvironment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlagEnvironment";
import type { ICommunityPlatformFeatureFlagEnvironmentDetail } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlagEnvironmentDetail";
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
import { generate_random_community_platform_admin_feature_flags_environments_details_create } from "../../../generate/generate_random_community_platform_admin_feature_flags_environments_details_create";
import { prepare_random_community_platform_feature_flag } from "../../../prepare/prepare_random_community_platform_feature_flag";
import { prepare_random_community_platform_feature_flag_environment } from "../../../prepare/prepare_random_community_platform_feature_flag_environment";
import { prepare_random_community_platform_feature_flag_environment_detail } from "../../../prepare/prepare_random_community_platform_feature_flag_environment_detail";

export async function test_api_feature_flag_environment_detail_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies DeepPartial<ICommunityPlatformAdmin.IJoin>,
  });
  typia.assert(admin);
  // 2. Create a feature flag
  const createFeatureFlagBody: ICommunityPlatformFeatureFlag.ICreate = {
    name: RandomGenerator.alphabets(10),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    flag_type: RandomGenerator.pick([
      "boolean",
      "percentage",
      "user_specific",
    ] as const),
    status: RandomGenerator.pick(["active", "inactive", "archived"] as const),
    boolean_value: null,
    percentage_value: null,
  };
  // Conditionally set values based on flag_type
  if (createFeatureFlagBody.flag_type === "boolean") {
    createFeatureFlagBody.boolean_value = RandomGenerator.pick([true, false]);
  } else if (createFeatureFlagBody.flag_type === "percentage") {
    createFeatureFlagBody.percentage_value = typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<100>
    >();
  }
  const featureFlag =
    await generate_random_community_platform_admin_feature_flags_create(
      adminConnection,
      { body: createFeatureFlagBody },
    );
  typia.assert(featureFlag);
  // 3. Create environment configuration for the feature flag
  const createEnvironmentBody = {
    is_enabled: RandomGenerator.pick([true, false]),
    rollout_percentage: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<100>
    >(),
  } satisfies ICommunityPlatformFeatureFlagEnvironment.ICreate;
  const environment =
    await generate_random_community_platform_admin_feature_flags_environments_create(
      adminConnection,
      {
        body: createEnvironmentBody,
        params: { featureFlagId: featureFlag.id },
      },
    );
  typia.assert(environment);
  // 4. Create detail configuration linking feature flag and environment
  const detail =
    await generate_random_community_platform_admin_feature_flags_environments_details_create(
      adminConnection,
      {
        body: {}, // ICreate is empty object
        params: {
          featureFlagId: featureFlag.id,
          environmentId: environment.id,
        },
      },
    );
  typia.assert(detail);
  // 5. Retrieve the detail configuration via GET endpoint
  const retrievedDetail =
    await api.functional.communityPlatform.admin.feature_flags.environments.details.at(
      adminConnection,
      {
        featureFlagId: featureFlag.id,
        environmentId: environment.id,
        detailId: detail.id,
      },
    );
  typia.assert(retrievedDetail);
  // Validate the retrieved detail matches the created one
  TestValidator.equals("detail id matches", retrievedDetail.id, detail.id);
  TestValidator.equals(
    "created_at matches",
    retrievedDetail.created_at,
    detail.created_at,
  );
  TestValidator.equals(
    "updated_at matches",
    retrievedDetail.updated_at,
    detail.updated_at,
  );
  // Validate feature flag summary relationship
  TestValidator.equals(
    "feature flag id matches",
    retrievedDetail.featureFlag.id,
    featureFlag.id,
  );
  TestValidator.equals(
    "feature flag name matches",
    retrievedDetail.featureFlag.name,
    featureFlag.name,
  );
  TestValidator.equals(
    "feature flag type matches",
    retrievedDetail.featureFlag.flag_type,
    featureFlag.flag_type,
  );
  TestValidator.equals(
    "feature flag status matches",
    retrievedDetail.featureFlag.status,
    featureFlag.status,
  );
  // Validate environment summary relationship
  TestValidator.equals(
    "environment id matches",
    retrievedDetail.environment.id,
    environment.id,
  );
  TestValidator.equals(
    "environment is_enabled matches",
    retrievedDetail.environment.is_enabled,
    environment.is_enabled,
  );
  TestValidator.equals(
    "environment rollout_percentage matches",
    retrievedDetail.environment.rollout_percentage,
    environment.rollout_percentage,
  );
  // Validate timestamps exist and are valid
  TestValidator.predicate(
    "has created_at",
    () =>
      retrievedDetail.created_at !== null &&
      retrievedDetail.created_at !== undefined,
  );
  TestValidator.predicate(
    "has updated_at",
    () =>
      retrievedDetail.updated_at !== null &&
      retrievedDetail.updated_at !== undefined,
  );
}