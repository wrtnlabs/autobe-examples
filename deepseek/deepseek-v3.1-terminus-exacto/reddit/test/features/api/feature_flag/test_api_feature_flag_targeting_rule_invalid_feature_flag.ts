import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlag";
import type { ICommunityPlatformFeatureFlagTargetingRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlagTargetingRule";
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
import { generate_random_community_platform_admin_feature_flags_targeting_rules_create } from "../../../generate/generate_random_community_platform_admin_feature_flags_targeting_rules_create";
import { prepare_random_community_platform_feature_flag } from "../../../prepare/prepare_random_community_platform_feature_flag";
import { prepare_random_community_platform_feature_flag_targeting_rule } from "../../../prepare/prepare_random_community_platform_feature_flag_targeting_rule";

export async function test_api_feature_flag_targeting_rule_invalid_feature_flag(
  connection: api.IConnection,
): Promise<void> {
  // Create admin authentication context
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
  // Create a valid feature flag
  const featureFlag =
    await generate_random_community_platform_admin_feature_flags_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          flag_type: "boolean" as const,
          status: "active" as const,
          boolean_value: true,
        } satisfies ICommunityPlatformFeatureFlag.ICreate,
      },
    );
  typia.assert(featureFlag);
  // Create a valid targeting rule
  const targetingRule =
    await generate_random_community_platform_admin_feature_flags_targeting_rules_create(
      adminConnection,
      {
        params: { featureFlagId: featureFlag.id },
        body: {
          rule_key: "user_role",
          rule_value: "admin",
          rule_operator: "equals",
          description: RandomGenerator.paragraph({ sentences: 1 }),
          priority: 0,
          is_active: true,
        } satisfies ICommunityPlatformFeatureFlagTargetingRule.ICreate,
      },
    );
  typia.assert(targetingRule);
  // Test with non-existent UUID (valid format but doesn't exist)
  const nonExistentUuid = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "non-existent feature flag ID",
    404,
    async () => {
      await api.functional.communityPlatform.admin.feature_flags.targeting_rules.at(
        adminConnection,
        {
          featureFlagId: nonExistentUuid,
          targetingRuleId: targetingRule.id,
        },
      );
    },
  );
  // Test with targeting rule belonging to wrong feature flag
  const anotherFeatureFlag =
    await generate_random_community_platform_admin_feature_flags_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          flag_type: "percentage" as const,
          status: "active" as const,
          percentage_value: 50,
        } satisfies ICommunityPlatformFeatureFlag.ICreate,
      },
    );
  typia.assert(anotherFeatureFlag);
  await TestValidator.httpError(
    "targeting rule doesn't belong to feature flag",
    404,
    async () => {
      await api.functional.communityPlatform.admin.feature_flags.targeting_rules.at(
        adminConnection,
        {
          featureFlagId: anotherFeatureFlag.id,
          targetingRuleId: targetingRule.id,
        },
      );
    },
  );
}
