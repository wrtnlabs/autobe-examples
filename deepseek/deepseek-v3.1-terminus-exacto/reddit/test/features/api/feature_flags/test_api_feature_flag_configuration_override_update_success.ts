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

/**
 * 测试管理员成功更新配置覆盖设置。
 * 1. 管理员创建特性标志
 * 2. 为特性标志创建环境配置
 * 3. 创建环境详细信息
 * 4. 创建初始配置覆盖（设置为'false'）
 * 5. 更新配置覆盖为'true'
 * 6. 验证更新后的配置值和时间戳
 */
export async function test_api_feature_flag_configuration_override_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. 创建管理员连接并认证
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    },
  });
  adminConnection.headers = { Authorization: admin.token.access };
  // 2. 创建特性标志
  const featureFlag =
    await generate_random_community_platform_admin_feature_flags_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          flag_type: "boolean" as const,
          status: "active" as const,
          boolean_value: true,
        },
      },
    );
  typia.assert(featureFlag);
  // 3. 创建环境配置
  const environment =
    await generate_random_community_platform_admin_feature_flags_environments_create(
      adminConnection,
      {
        params: { featureFlagId: featureFlag.id },
        body: {
          is_enabled: true,
          rollout_percentage: 100 satisfies number as number,
        },
      },
    );
  typia.assert(environment);
  // 4. 创建环境详细信息
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
  // 5. 创建初始配置覆盖（设置为'false'）
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
          config_value: "false",
        },
      },
    );
  typia.assert(initialOverride);
  // 6. 更新配置覆盖为'true'
  const updateBody: ICommunityPlatformFeatureFlagEnvironmentDetailConfigurationOverride.IUpdate =
    {
      config_key: "enabled",
      config_value: "true",
    };
  const updatedOverride =
    await api.functional.communityPlatform.admin.feature_flags.environments.details.configuration_overrides.putByFeatureflagidAndEnvironmentidAndDetailidAndOverrideid(
      adminConnection,
      {
        featureFlagId: featureFlag.id,
        environmentId: environment.id,
        detailId: detail.id,
        overrideId: initialOverride.id,
        body: updateBody,
      },
    );
  typia.assert(updatedOverride);
  // 7. 验证更新后的配置值
  TestValidator.equals(
    "config_key 保持不变",
    updatedOverride.config_key,
    "enabled",
  );
  TestValidator.equals(
    "config_value 更新为 true",
    updatedOverride.config_value,
    "true",
  );
  // 8. 验证时间戳已更新
  TestValidator.predicate(
    "updated_at 已更新",
    new Date(updatedOverride.updated_at).getTime() >
      new Date(initialOverride.updated_at).getTime(),
  );
  // 9. 验证其他属性未改变
  TestValidator.equals("id 不变", updatedOverride.id, initialOverride.id);
  TestValidator.equals(
    "created_at 不变",
    updatedOverride.created_at,
    initialOverride.created_at,
  );
}
