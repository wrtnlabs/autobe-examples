import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlag";
import type { ICommunityPlatformFeatureFlagEnvironment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlagEnvironment";
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
import { generate_random_community_platform_admin_feature_flags_environments_targeting_rules_create } from "../../../generate/generate_random_community_platform_admin_feature_flags_environments_targeting_rules_create";
import { prepare_random_community_platform_feature_flag } from "../../../prepare/prepare_random_community_platform_feature_flag";
import { prepare_random_community_platform_feature_flag_environment } from "../../../prepare/prepare_random_community_platform_feature_flag_environment";
import { prepare_random_community_platform_feature_flag_environment_targeting_rule } from "../../../prepare/prepare_random_community_platform_feature_flag_environment_targeting_rule";

export async function test_api_feature_flag_targeting_rule_duplicate_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  await typia.assert(admin);
  // 2. Create feature flag
  const featureFlag =
    await generate_random_community_platform_admin_feature_flags_create(
      adminConnection,
      {},
    );
  await typia.assert(featureFlag);
  // 3. Create environment configuration
  const environment =
    await generate_random_community_platform_admin_feature_flags_environments_create(
      adminConnection,
      {
        params: { featureFlagId: featureFlag.id },
        body: {
          is_enabled: true,
        } satisfies ICommunityPlatformFeatureFlagEnvironment.ICreate,
      },
    );
  await typia.assert(environment);
  // 4. Create first targeting rule with specific rule_key
  const ruleKey = RandomGenerator.alphabets(10); // Random rule key to avoid collisions
  const firstValue = RandomGenerator.alphabets(8);
  const firstRule =
    await generate_random_community_platform_admin_feature_flags_environments_targeting_rules_create(
      adminConnection,
      {
        params: {
          featureFlagId: featureFlag.id,
          environmentId: environment.id,
        },
        body: {
          rule_key: ruleKey,
          rule_value: firstValue,
        } satisfies ICommunityPlatformFeatureFlagEnvironmentTargetingRule.ICreate,
      },
    );
  await typia.assert(firstRule);
  // 5. Attempt to create second targeting rule with same rule_key but different value
  const secondValue = RandomGenerator.alphabets(8);
  await TestValidator.error(
    "duplicate targeting rule should be prevented",
    async () => {
      await generate_random_community_platform_admin_feature_flags_environments_targeting_rules_create(
        adminConnection,
        {
          params: {
            featureFlagId: featureFlag.id,
            environmentId: environment.id,
          },
          body: {
            rule_key: ruleKey,
            rule_value: secondValue,
          } satisfies ICommunityPlatformFeatureFlagEnvironmentTargetingRule.ICreate,
        },
      );
    },
  );
  // 6. Validate the first rule's properties (business logic validation after typia.assert)
  TestValidator.equals("rule key matches", firstRule.rule_key, ruleKey);
  TestValidator.equals("rule value matches", firstRule.rule_value, firstValue);
  TestValidator.predicate("has valid UUID ID", firstRule.id.length > 0);
  return;
}
