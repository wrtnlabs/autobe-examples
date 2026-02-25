import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlag";
import type { ICommunityPlatformFeatureFlagEnvironment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlagEnvironment";
import type { ICommunityPlatformFeatureFlagEnvironmentDetail } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlagEnvironmentDetail";
import type { ICommunityPlatformFeatureFlagEnvironmentTargetingRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlagEnvironmentTargetingRule";
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
import { generate_random_community_platform_admin_feature_flags_environments_details_targeting_rules_create } from "../../../generate/generate_random_community_platform_admin_feature_flags_environments_details_targeting_rules_create";
import { prepare_random_community_platform_feature_flag } from "../../../prepare/prepare_random_community_platform_feature_flag";
import { prepare_random_community_platform_feature_flag_environment } from "../../../prepare/prepare_random_community_platform_feature_flag_environment";
import { prepare_random_community_platform_feature_flag_environment_detail } from "../../../prepare/prepare_random_community_platform_feature_flag_environment_detail";
import { prepare_random_community_platform_feature_flag_environment_targeting_rule } from "../../../prepare/prepare_random_community_platform_feature_flag_environment_targeting_rule";

export async function test_api_feature_flag_targeting_rule_geographic_rollout(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create feature flag with user_specific type for geographic targeting
  const featureFlag =
    await generate_random_community_platform_admin_feature_flags_create(
      adminConnection,
      {
        body: {
          name: `geo_targeting_flag_${RandomGenerator.alphaNumeric(8)}`,
          description: "Feature flag for geographic targeting rule testing",
          flag_type: "user_specific",
          status: "active",
        } satisfies ICommunityPlatformFeatureFlag.ICreate,
      },
    );
  typia.assert(featureFlag);
  // 3. Create production environment configuration
  const environment =
    await generate_random_community_platform_admin_feature_flags_environments_create(
      adminConnection,
      {
        body: {
          is_enabled: true,
          rollout_percentage: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<50> & tags.Maximum<100>
          >(),
        } satisfies ICommunityPlatformFeatureFlagEnvironment.ICreate,
        params: {
          featureFlagId: featureFlag.id,
        },
      },
    );
  typia.assert(environment);
  // 4. Create environment details relationship
  const environmentDetail =
    await generate_random_community_platform_admin_feature_flags_environments_details_create(
      adminConnection,
      {
        body: {} satisfies ICommunityPlatformFeatureFlagEnvironmentDetail.ICreate,
        params: {
          featureFlagId: featureFlag.id,
          environmentId: environment.id,
        },
      },
    );
  typia.assert(environmentDetail);
  // 5. Create geographic targeting rules for different regions
  const geographicRegions = ["US", "EU", "ASIA", "LATAM", "AFRICA"] as const;
  for (const region of geographicRegions) {
    const targetingRule =
      await generate_random_community_platform_admin_feature_flags_environments_details_targeting_rules_create(
        adminConnection,
        {
          body: {
            rule_key: "geo_location",
            rule_value: region,
          } satisfies ICommunityPlatformFeatureFlagEnvironmentTargetingRule.ICreate,
          params: {
            featureFlagId: featureFlag.id,
            environmentId: environment.id,
            detailId: environmentDetail.id,
          },
        },
      );
    typia.assert(targetingRule);
    // Validate targeting rule properties
    TestValidator.equals(
      "rule key matches",
      targetingRule.rule_key,
      "geo_location",
    );
    TestValidator.equals(
      "rule value matches",
      targetingRule.rule_value,
      region,
    );
  }
  // 6. Test international character sets with special region names
  const internationalRegions = [
    "日本", // Japan
    "中国", // China
    "Россия", // Russia
    "España", // Spain
    "Deutschland", // Germany
  ] as const;
  for (const region of internationalRegions) {
    const targetingRule =
      await generate_random_community_platform_admin_feature_flags_environments_details_targeting_rules_create(
        adminConnection,
        {
          body: {
            rule_key: "geo_location",
            rule_value: region,
          } satisfies ICommunityPlatformFeatureFlagEnvironmentTargetingRule.ICreate,
          params: {
            featureFlagId: featureFlag.id,
            environmentId: environment.id,
            detailId: environmentDetail.id,
          },
        },
      );
    typia.assert(targetingRule);
    TestValidator.equals(
      "international rule key matches",
      targetingRule.rule_key,
      "geo_location",
    );
    TestValidator.equals(
      "international rule value matches",
      targetingRule.rule_value,
      region,
    );
  }
  // 7. Test percentage-based geographic rollouts
  const percentageRules = ["10", "25", "50", "75", "90"] as const;
  for (const percentage of percentageRules) {
    const targetingRule =
      await generate_random_community_platform_admin_feature_flags_environments_details_targeting_rules_create(
        adminConnection,
        {
          body: {
            rule_key: "percentage",
            rule_value: percentage,
          } satisfies ICommunityPlatformFeatureFlagEnvironmentTargetingRule.ICreate,
          params: {
            featureFlagId: featureFlag.id,
            environmentId: environment.id,
            detailId: environmentDetail.id,
          },
        },
      );
    typia.assert(targetingRule);
    TestValidator.equals(
      "percentage rule key matches",
      targetingRule.rule_key,
      "percentage",
    );
    TestValidator.equals(
      "percentage rule value matches",
      targetingRule.rule_value,
      percentage,
    );
  }
}
