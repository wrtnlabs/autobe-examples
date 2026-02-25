import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlag";
import type { ICommunityPlatformFeatureFlagEnvironment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlagEnvironment";
import type { ICommunityPlatformFeatureFlagEnvironmentDetail } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlagEnvironmentDetail";
import type { ICommunityPlatformFeatureFlagEnvironmentDetailConfigurationOverride } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlagEnvironmentDetailConfigurationOverride";
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
import { generate_random_community_platform_admin_feature_flags_environments_details_configuration_overrides_create } from "../../../generate/generate_random_community_platform_admin_feature_flags_environments_details_configuration_overrides_create";
import { generate_random_community_platform_admin_feature_flags_environments_details_create } from "../../../generate/generate_random_community_platform_admin_feature_flags_environments_details_create";
import { prepare_random_community_platform_feature_flag } from "../../../prepare/prepare_random_community_platform_feature_flag";
import { prepare_random_community_platform_feature_flag_environment } from "../../../prepare/prepare_random_community_platform_feature_flag_environment";
import { prepare_random_community_platform_feature_flag_environment_detail } from "../../../prepare/prepare_random_community_platform_feature_flag_environment_detail";
import { prepare_random_community_platform_feature_flag_environment_detail_configuration_override } from "../../../prepare/prepare_random_community_platform_feature_flag_environment_detail_configuration_override";

export async function test_api_feature_flag_configuration_override_invalid_key(
  connection: api.IConnection,
): Promise<void> {
  // 1. 管理员身份认证
  const adminConnection: api.IConnection = { host: connection.host };
  const authorizedAdmin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    },
  });
  typia.assert(authorizedAdmin);
  // 2. 创建特性标志
  const featureFlag =
    await generate_random_community_platform_admin_feature_flags_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          flag_type: "boolean",
          status: "active",
          boolean_value: true,
        },
      },
    );
  typia.assert(featureFlag);
  // 3. 为特性标志创建环境
  const environment =
    await generate_random_community_platform_admin_feature_flags_environments_create(
      adminConnection,
      {
        params: { featureFlagId: featureFlag.id },
        body: {
          is_enabled: true,
          rollout_percentage: null,
        },
      },
    );
  typia.assert(environment);
  // 4. 创建环境详情
  const detail =
    await generate_random_community_platform_admin_feature_flags_environments_details_create(
      adminConnection,
      {
        params: {
          featureFlagId: featureFlag.id,
          environmentId: environment.id,
        },
        body: {},
      },
    );
  typia.assert(detail);
  // 5. 为环境详情创建有效的初始配置覆盖
  const initialOverride =
    await generate_random_community_platform_admin_feature_flags_environments_details_configuration_overrides_create(
      adminConnection,
      {
        params: {
          featureFlagId: featureFlag.id,
          environmentId: environment.id,
          detailId: detail.id,
        },
        body: {
          config_key: "enabled",
          config_value: "true",
        },
      },
    );
  typia.assert(initialOverride);
  // 6. 尝试使用无效的配置键更新配置覆盖
  await TestValidator.error("应该拒绝无效的配置键", async () => {
    await api.functional.communityPlatform.admin.feature_flags.environments.details.configuration_overrides.putByFeatureflagidAndEnvironmentidAndDetailidAndOverrideid(
      adminConnection,
      {
        featureFlagId: featureFlag.id,
        environmentId: environment.id,
        detailId: detail.id,
        overrideId: initialOverride.id,
        body: {
          config_key: "unsupported_key",
          config_value: "some_value",
        } satisfies ICommunityPlatformFeatureFlagEnvironmentDetailConfigurationOverride.IUpdate,
      },
    );
  });
  // 7. 验证原始配置覆盖未被修改
  const getResponse =
    await api.functional.communityPlatform.admin.feature_flags.environments.details.configuration_overrides.putByFeatureflagidAndEnvironmentidAndDetailidAndOverrideid(
      adminConnection,
      {
        featureFlagId: featureFlag.id,
        environmentId: environment.id,
        detailId: detail.id,
        overrideId: initialOverride.id,
        body: {
          // 空更新以获取当前值
        } satisfies ICommunityPlatformFeatureFlagEnvironmentDetailConfigurationOverride.IUpdate,
      },
    );
  typia.assert(getResponse);
  TestValidator.equals("配置键应该未被修改", getResponse.config_key, "enabled");
  TestValidator.equals("配置值应该未被修改", getResponse.config_value, "true");
}
