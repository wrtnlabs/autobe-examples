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

export async function test_api_feature_flag_targeting_rule_deletion_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Create first feature flag
  const featureFlag1 =
    await generate_random_community_platform_admin_feature_flags_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          flag_type: "boolean",
          status: "active",
          boolean_value: true,
        } satisfies ICommunityPlatformFeatureFlag.ICreate,
      },
    );
  typia.assert(featureFlag1);
  // Create targeting rule for first feature flag
  const targetingRule =
    await generate_random_community_platform_admin_feature_flags_targeting_rules_create(
      adminConnection,
      {
        params: { featureFlagId: featureFlag1.id },
        body: {
          rule_key: "user_role",
          rule_value: "admin",
          rule_operator: "equals",
          description: RandomGenerator.paragraph({ sentences: 2 }),
          priority: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          is_active: true,
        } satisfies ICommunityPlatformFeatureFlagTargetingRule.ICreate,
      },
    );
  typia.assert(targetingRule);
  // Create second feature flag
  const featureFlag2 =
    await generate_random_community_platform_admin_feature_flags_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          flag_type: "percentage",
          status: "active",
          percentage_value: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<100>
          >(),
        } satisfies ICommunityPlatformFeatureFlag.ICreate,
      },
    );
  typia.assert(featureFlag2);
  // Test 1: Attempt to delete targeting rule with non-existent UUID
  await TestValidator.httpError(
    "delete targeting rule with non-existent UUID",
    404,
    async () => {
      await api.functional.communityPlatform.admin.feature_flags.targeting_rules.erase(
        adminConnection,
        {
          featureFlagId: featureFlag1.id,
          targetingRuleId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
  // Test 2: Attempt to delete targeting rule that belongs to different feature flag
  await TestValidator.httpError(
    "delete targeting rule from wrong feature flag",
    404,
    async () => {
      await api.functional.communityPlatform.admin.feature_flags.targeting_rules.erase(
        adminConnection,
        {
          featureFlagId: featureFlag2.id,
          targetingRuleId: targetingRule.id,
        },
      );
    },
  );
  // Verify targeting rule still exists by attempting to create a duplicate
  // Since listing endpoint is not available, we verify the rule exists by ensuring
  // we can't create another rule with the same key/value combination
  await TestValidator.error(
    "should not allow duplicate targeting rule creation",
    async () => {
      await generate_random_community_platform_admin_feature_flags_targeting_rules_create(
        adminConnection,
        {
          params: { featureFlagId: featureFlag1.id },
          body: {
            rule_key: "user_role",
            rule_value: "admin",
            rule_operator: "equals",
            description: "Duplicate rule",
            priority: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<0>
            >(),
            is_active: true,
          } satisfies ICommunityPlatformFeatureFlagTargetingRule.ICreate,
        },
      );
    },
  );
}
