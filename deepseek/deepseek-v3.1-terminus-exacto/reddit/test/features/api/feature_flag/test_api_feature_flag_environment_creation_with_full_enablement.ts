import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlag";
import type { ICommunityPlatformFeatureFlagEnvironment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlagEnvironment";
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
import { prepare_random_community_platform_feature_flag } from "../../../prepare/prepare_random_community_platform_feature_flag";
import { prepare_random_community_platform_feature_flag_environment } from "../../../prepare/prepare_random_community_platform_feature_flag_environment";

export async function test_api_feature_flag_environment_creation_with_full_enablement(
  connection: api.IConnection,
): Promise<void> {
  // 1. 管理员身份认证
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
  // 2. 创建百分比类型的功能标志
  const featureFlag =
    await generate_random_community_platform_admin_feature_flags_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          flag_type: "percentage",
          status: "active",
          percentage_value: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<100>
          >() satisfies number as number,
          boolean_value: null,
        } satisfies ICommunityPlatformFeatureFlag.ICreate,
      },
    );
  typia.assert(featureFlag);
  TestValidator.equals(
    "feature flag type is percentage",
    featureFlag.flag_type,
    "percentage",
  );
  TestValidator.predicate(
    "percentage value is set",
    featureFlag.percentage_value !== null,
  );
  // 3. 创建环境配置，全部启用（rollout_percentage 为 null）
  const environment =
    await generate_random_community_platform_admin_feature_flags_environments_create(
      adminConnection,
      {
        body: {
          is_enabled: true,
          rollout_percentage: null,
        } satisfies ICommunityPlatformFeatureFlagEnvironment.ICreate,
        params: {
          featureFlagId: featureFlag.id,
        },
      },
    );
  typia.assert(environment);
  // 4. 验证响应正确性
  TestValidator.equals("environment is enabled", environment.is_enabled, true);
  TestValidator.equals(
    "rollout percentage is null",
    environment.rollout_percentage,
    null,
  );
  TestValidator.equals(
    "feature flag id matches",
    environment.feature_flag.id,
    featureFlag.id,
  );
  TestValidator.equals(
    "feature flag type remains percentage",
    environment.feature_flag.flag_type,
    "percentage",
  );
  TestValidator.predicate(
    "feature flag summary has percentage value",
    environment.feature_flag.percentage_value !== null,
  );
}
