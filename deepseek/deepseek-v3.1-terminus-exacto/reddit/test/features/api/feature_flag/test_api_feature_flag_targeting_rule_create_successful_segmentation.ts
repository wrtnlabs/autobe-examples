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

export async function test_api_feature_flag_targeting_rule_create_successful_segmentation(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
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
  // Create parent feature flag
  const featureFlag =
    await generate_random_community_platform_admin_feature_flags_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          flag_type: "user_specific",
          status: "active",
          boolean_value: null,
          percentage_value: null,
        } satisfies ICommunityPlatformFeatureFlag.ICreate,
      },
    );
  typia.assert(featureFlag);
  // Create targeting rule
  const targetingRule =
    await generate_random_community_platform_admin_feature_flags_targeting_rules_create(
      adminConnection,
      {
        body: {
          rule_key: "user_role",
          rule_value: "moderator",
          rule_operator: "equals",
          description: "Target moderators for early access",
          priority: 1,
          is_active: true,
        } satisfies ICommunityPlatformFeatureFlagTargetingRule.ICreate,
        params: {
          featureFlagId: featureFlag.id,
        },
      },
    );
  typia.assert(targetingRule);
  // Validate response structure
  TestValidator.equals("rule_key matches", targetingRule.rule_key, "user_role");
  TestValidator.equals(
    "rule_value matches",
    targetingRule.rule_value,
    "moderator",
  );
  TestValidator.equals(
    "rule_operator matches",
    targetingRule.rule_operator,
    "equals",
  );
  TestValidator.equals(
    "description matches",
    targetingRule.description,
    "Target moderators for early access",
  );
  TestValidator.equals("priority matches", targetingRule.priority, 1);
  TestValidator.predicate("is_active is true", targetingRule.is_active);
  TestValidator.predicate(
    "has valid UUID id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      targetingRule.id,
    ),
  );
  TestValidator.predicate(
    "has created_at timestamp",
    targetingRule.created_at !== null && targetingRule.created_at !== undefined,
  );
  TestValidator.predicate(
    "has updated_at timestamp",
    targetingRule.updated_at !== null && targetingRule.updated_at !== undefined,
  );
  TestValidator.equals("deleted_at is null", targetingRule.deleted_at, null);
}
