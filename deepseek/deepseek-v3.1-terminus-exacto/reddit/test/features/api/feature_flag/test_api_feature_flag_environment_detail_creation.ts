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

export async function test_api_feature_flag_environment_detail_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account
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
  // 2. Create boolean feature flag
  const featureFlag =
    await generate_random_community_platform_admin_feature_flags_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          flag_type: "boolean" as const,
          status: "active" as const,
          boolean_value: true,
        } satisfies ICommunityPlatformFeatureFlag.ICreate,
      },
    );
  typia.assert(featureFlag);
  // 3. Create environment configuration
  const environment =
    await generate_random_community_platform_admin_feature_flags_environments_create(
      adminConnection,
      {
        params: { featureFlagId: featureFlag.id },
        body: {
          is_enabled: true,
          rollout_percentage: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<100>
          >(),
        } satisfies ICommunityPlatformFeatureFlagEnvironment.ICreate,
      },
    );
  typia.assert(environment);
  // 4. Create environment detail
  const detail =
    await generate_random_community_platform_admin_feature_flags_environments_details_create(
      adminConnection,
      {
        params: {
          featureFlagId: featureFlag.id,
          environmentId: environment.id,
        },
        body: {} satisfies ICommunityPlatformFeatureFlagEnvironmentDetail.ICreate,
      },
    );
  typia.assert(detail);
  // 5. Validate detail record structure
  TestValidator.equals(
    "detail has feature flag reference",
    detail.featureFlag.id,
    featureFlag.id,
  );
  TestValidator.equals(
    "detail has environment reference",
    detail.environment.id,
    environment.id,
  );
  TestValidator.predicate("created_at is set", detail.created_at !== null);
  TestValidator.predicate("updated_at is set", detail.updated_at !== null);
  // 6. Test unique constraint by attempting to create duplicate
  await TestValidator.error(
    "duplicate detail creation should fail",
    async () => {
      await generate_random_community_platform_admin_feature_flags_environments_details_create(
        adminConnection,
        {
          params: {
            featureFlagId: featureFlag.id,
            environmentId: environment.id,
          },
          body: {} satisfies ICommunityPlatformFeatureFlagEnvironmentDetail.ICreate,
        },
      );
    },
  );
}
