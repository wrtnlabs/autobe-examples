import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlag";
import type { ICommunityPlatformFeatureFlagEnvironment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlagEnvironment";
import type { ICommunityPlatformFeatureFlagEnvironmentDetail } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlagEnvironmentDetail";
import type { ICommunityPlatformFeatureFlagEnvironmentDetailTargetingRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlagEnvironmentDetailTargetingRule";
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

export async function test_api_feature_flag_update_targeting_rule_reorder_activation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
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
  // 2. Create feature flag hierarchy foundation
  const featureFlag =
    await generate_random_community_platform_admin_feature_flags_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          flag_type: "boolean",
          status: "active",
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
          rollout_percentage: 100,
        } satisfies ICommunityPlatformFeatureFlagEnvironment.ICreate,
      },
    );
  typia.assert(environment);
  // 4. Create environment detail with specific configuration settings
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
  // 5. Create initial targeting rule to be updated using the correct utility function
  const initialTargetingRule =
    await generate_random_community_platform_admin_feature_flags_environments_details_targeting_rules_create(
      adminConnection,
      {
        params: {
          featureFlagId: featureFlag.id,
          environmentId: environment.id,
          detailId: detail.id,
        },
        body: {
          rule_key: "user_karma_threshold",
          rule_value: "100",
        } satisfies ICommunityPlatformFeatureFlagEnvironmentTargetingRule.ICreate,
      },
    );
  typia.assert(initialTargetingRule);
  // 6. Update targeting rule's evaluation order and activation status
  const updateBody: ICommunityPlatformFeatureFlagEnvironmentDetailTargetingRule.IUpdate =
    {
      rule_order: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
      >(),
      is_active: false,
    };
  const updatedTargetingRule =
    await api.functional.communityPlatform.admin.feature_flags.environments.details.targeting_rules.update(
      adminConnection,
      {
        featureFlagId: featureFlag.id,
        environmentId: environment.id,
        detailId: detail.id,
        targetingRuleId: initialTargetingRule.id,
        body: updateBody,
      },
    );
  typia.assert(updatedTargetingRule);
  // 7. Validate the updated rule reflects changes using property names from the correct DTO
  TestValidator.equals(
    "targeting rule ID unchanged",
    updatedTargetingRule.id,
    initialTargetingRule.id,
  );
  TestValidator.equals(
    "rule_order updated",
    updatedTargetingRule.ruleOrder,
    updateBody.rule_order,
  );
  TestValidator.equals(
    "is_active updated",
    updatedTargetingRule.isActive,
    updateBody.is_active,
  );
  TestValidator.predicate(
    "has updated_at timestamp",
    updatedTargetingRule.updatedAt !== initialTargetingRule.created_at,
  );
  // 8. Verify hierarchical integrity - rule still maintains its core identity
  TestValidator.predicate(
    "rule maintains basic properties",
    updatedTargetingRule.id === initialTargetingRule.id,
  );
}
