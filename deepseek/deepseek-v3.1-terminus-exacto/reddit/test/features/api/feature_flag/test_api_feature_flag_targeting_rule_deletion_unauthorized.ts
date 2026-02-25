import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlag";
import type { ICommunityPlatformFeatureFlagTargetingRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlagTargetingRule";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_admin_feature_flags_create } from "../../../generate/generate_random_community_platform_admin_feature_flags_create";
import { generate_random_community_platform_admin_feature_flags_targeting_rules_create } from "../../../generate/generate_random_community_platform_admin_feature_flags_targeting_rules_create";
import { prepare_random_community_platform_feature_flag } from "../../../prepare/prepare_random_community_platform_feature_flag";
import { prepare_random_community_platform_feature_flag_targeting_rule } from "../../../prepare/prepare_random_community_platform_feature_flag_targeting_rule";

export async function test_api_feature_flag_targeting_rule_deletion_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Admin1234!" satisfies string as string &
        tags.Format<"password">,
      display_name: "Test Admin",
      permissions_level: "full",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // 2. Create feature flag as admin
  const featureFlag =
    await generate_random_community_platform_admin_feature_flags_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          flag_type: "boolean",
          status: "active",
          boolean_value: true,
        } satisfies ICommunityPlatformFeatureFlag.ICreate,
      },
    );
  typia.assert(featureFlag);
  // 3. Create targeting rule as admin
  const targetingRule =
    await generate_random_community_platform_admin_feature_flags_targeting_rules_create(
      adminConnection,
      {
        params: { featureFlagId: featureFlag.id },
        body: {
          rule_key: "user_role",
          rule_value: "moderator",
          rule_operator: "equals",
          description: "Test targeting rule for moderators",
          priority: 1,
          is_active: true,
        } satisfies ICommunityPlatformFeatureFlagTargetingRule.ICreate,
      },
    );
  typia.assert(targetingRule);
  // 4. Regular user setup and authentication
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "User1234!" satisfies string as string &
        tags.Format<"password">,
      username: RandomGenerator.alphaNumeric(8),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 1 }),
      avatar_url: null,
    } satisfies ICommunityPlatformUser.IJoin,
  });
  // 5. Attempt deletion as regular user - should fail with 403
  await TestValidator.httpError(
    "non-admin user cannot delete targeting rule",
    403,
    async () => {
      await api.functional.communityPlatform.admin.feature_flags.targeting_rules.erase(
        userConnection,
        {
          featureFlagId: featureFlag.id,
          targetingRuleId: targetingRule.id,
        },
      );
    },
  );
}
