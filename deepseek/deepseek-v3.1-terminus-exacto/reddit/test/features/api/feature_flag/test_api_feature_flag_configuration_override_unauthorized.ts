import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlag";
import type { ICommunityPlatformFeatureFlagEnvironment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlagEnvironment";
import type { ICommunityPlatformFeatureFlagEnvironmentDetail } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlagEnvironmentDetail";
import type { ICommunityPlatformFeatureFlagEnvironmentDetailConfigurationOverride } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlagEnvironmentDetailConfigurationOverride";
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
import { generate_random_community_platform_admin_feature_flags_environments_create } from "../../../generate/generate_random_community_platform_admin_feature_flags_environments_create";
import { generate_random_community_platform_admin_feature_flags_environments_details_configuration_overrides_create } from "../../../generate/generate_random_community_platform_admin_feature_flags_environments_details_configuration_overrides_create";
import { generate_random_community_platform_admin_feature_flags_environments_details_create } from "../../../generate/generate_random_community_platform_admin_feature_flags_environments_details_create";
import { prepare_random_community_platform_feature_flag } from "../../../prepare/prepare_random_community_platform_feature_flag";
import { prepare_random_community_platform_feature_flag_environment } from "../../../prepare/prepare_random_community_platform_feature_flag_environment";
import { prepare_random_community_platform_feature_flag_environment_detail } from "../../../prepare/prepare_random_community_platform_feature_flag_environment_detail";
import { prepare_random_community_platform_feature_flag_environment_detail_configuration_override } from "../../../prepare/prepare_random_community_platform_feature_flag_environment_detail_configuration_override";

export async function test_api_feature_flag_configuration_override_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // 1. 创建管理员并建立完整的特性标志层级结构
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: "AdminPassword123!",
      display_name: "Test Admin",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // 创建特性标志
  const featureFlag =
    await generate_random_community_platform_admin_feature_flags_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(12),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          flag_type: "boolean" as const,
          status: "active" as const,
          boolean_value: true,
        } satisfies ICommunityPlatformFeatureFlag.ICreate,
      },
    );
  typia.assert(featureFlag);
  // 创建环境
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
  // 创建环境详情
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
  // 创建初始配置覆盖
  const originalOverride =
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
        } satisfies ICommunityPlatformFeatureFlagEnvironmentDetailConfigurationOverride.ICreate,
      },
    );
  typia.assert(originalOverride);
  // 2. 验证管理员能够成功更新配置覆盖
  const updatedOverride =
    await api.functional.communityPlatform.admin.feature_flags.environments.details.configuration_overrides.putByFeatureflagidAndEnvironmentidAndDetailidAndOverrideid(
      adminConnection,
      {
        featureFlagId: featureFlag.id,
        environmentId: environment.id,
        detailId: detail.id,
        overrideId: originalOverride.id,
        body: {
          config_key: "enabled",
          config_value: "false",
        } satisfies ICommunityPlatformFeatureFlagEnvironmentDetailConfigurationOverride.IUpdate,
      },
    );
  typia.assert(updatedOverride);
  TestValidator.equals(
    "管理员应该能够成功更新配置覆盖",
    updatedOverride.config_value,
    "false",
  );
  // 3. 普通用户尝试更新配置覆盖（应该失败）
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "UserPassword123!",
      username: RandomGenerator.alphaNumeric(8),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  // 尝试更新配置覆盖并验证失败
  await TestValidator.httpError(
    "普通用户应该无法更新特性标志配置覆盖",
    [401, 403], // Unauthorized 或 Forbidden
    async () => {
      await api.functional.communityPlatform.admin.feature_flags.environments.details.configuration_overrides.putByFeatureflagidAndEnvironmentidAndDetailidAndOverrideid(
        userConnection,
        {
          featureFlagId: featureFlag.id,
          environmentId: environment.id,
          detailId: detail.id,
          overrideId: updatedOverride.id,
          body: {
            config_key: "enabled",
            config_value: "true",
          } satisfies ICommunityPlatformFeatureFlagEnvironmentDetailConfigurationOverride.IUpdate,
        },
      );
    },
  );
  // 4. 验证配置没有被普通用户修改（管理员重新获取确认）
  const finalOverride =
    await api.functional.communityPlatform.admin.feature_flags.environments.details.configuration_overrides.putByFeatureflagidAndEnvironmentidAndDetailidAndOverrideid(
      adminConnection,
      {
        featureFlagId: featureFlag.id,
        environmentId: environment.id,
        detailId: detail.id,
        overrideId: updatedOverride.id,
        body: {
          config_key: "enabled",
          config_value: "false",
        } satisfies ICommunityPlatformFeatureFlagEnvironmentDetailConfigurationOverride.IUpdate,
      },
    );
  typia.assert(finalOverride);
  TestValidator.equals(
    "普通用户操作后配置应该保持不变",
    finalOverride.config_value,
    "false",
  );
}
