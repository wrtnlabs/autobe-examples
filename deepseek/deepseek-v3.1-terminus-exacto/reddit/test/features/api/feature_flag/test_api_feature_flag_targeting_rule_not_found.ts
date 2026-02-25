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
import { prepare_random_community_platform_feature_flag } from "../../../prepare/prepare_random_community_platform_feature_flag";

/**
 * Test error handling for non-existent targeting rule retrieval.
 * Tests multiple scenarios:
 * 1. Targeting rule that never existed
 * 2. Targeting rule belonging to different feature flag
 * 3. Deleted targeting rule
 */
export async function test_api_feature_flag_targeting_rule_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
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
  // 2. Create feature flag
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
  // 3. Test targeting rule that never existed
  await TestValidator.httpError(
    "targeting rule never existed",
    404,
    async () => {
      await api.functional.communityPlatform.admin.feature_flags.targeting_rules.at(
        adminConnection,
        {
          featureFlagId: featureFlag.id,
          targetingRuleId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
  // 4. Test targeting rule belonging to different feature flag
  const anotherFeatureFlag =
    await generate_random_community_platform_admin_feature_flags_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          flag_type: "percentage",
          status: "active",
          percentage_value: 50,
        } satisfies ICommunityPlatformFeatureFlag.ICreate,
      },
    );
  typia.assert(anotherFeatureFlag);
  await TestValidator.httpError(
    "targeting rule from wrong feature flag",
    404,
    async () => {
      await api.functional.communityPlatform.admin.feature_flags.targeting_rules.at(
        adminConnection,
        {
          featureFlagId: featureFlag.id,
          targetingRuleId: anotherFeatureFlag.id, // Using feature flag ID as targeting rule ID
        },
      );
    },
  );
}
