import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlag";
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
import { generate_random_community_platform_admin_feature_flags_environments_targeting_rules_create } from "../../../generate/generate_random_community_platform_admin_feature_flags_environments_targeting_rules_create";
import { prepare_random_community_platform_feature_flag } from "../../../prepare/prepare_random_community_platform_feature_flag";
import { prepare_random_community_platform_feature_flag_environment_targeting_rule } from "../../../prepare/prepare_random_community_platform_feature_flag_environment_targeting_rule";

export async function test_api_feature_flag_targeting_rule_invalid_environment(
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
  // Create a valid feature flag with proper flag_type handling
  const flagType = RandomGenerator.pick([
    "boolean",
    "percentage",
    "user_specific",
  ] as const);
  const featureFlag =
    await generate_random_community_platform_admin_feature_flags_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          flag_type: flagType,
          status: "active",
          boolean_value:
            flagType === "boolean" ? RandomGenerator.pick([true, false]) : null,
          percentage_value:
            flagType === "percentage"
              ? typia.random<
                  number &
                    tags.Type<"int32"> &
                    tags.Minimum<0> &
                    tags.Maximum<100>
                >()
              : null,
        } satisfies ICommunityPlatformFeatureFlag.ICreate,
      },
    );
  typia.assert(featureFlag);
  // Attempt to create targeting rule with invalid environment ID
  await TestValidator.error(
    "creating targeting rule with non-existent environment should fail",
    async () => {
      await api.functional.communityPlatform.admin.feature_flags.environments.targeting_rules.create(
        adminConnection,
        {
          featureFlagId: featureFlag.id,
          environmentId: typia.random<string & tags.Format<"uuid">>(), // Random invalid UUID
          body: {
            rule_key: RandomGenerator.pick([
              "user_role",
              "geo_location",
              "percentage",
            ] as const),
            rule_value: RandomGenerator.alphaNumeric(8),
          } satisfies ICommunityPlatformFeatureFlagEnvironmentTargetingRule.ICreate,
        },
      );
    },
  );
}
