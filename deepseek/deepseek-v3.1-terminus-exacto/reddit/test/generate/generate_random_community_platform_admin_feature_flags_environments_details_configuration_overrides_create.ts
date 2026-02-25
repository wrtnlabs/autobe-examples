import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformFeatureFlagEnvironmentDetailConfigurationOverride } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlagEnvironmentDetailConfigurationOverride";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_platform_feature_flag_environment_detail_configuration_override } from "../prepare/prepare_random_community_platform_feature_flag_environment_detail_configuration_override";

export async function generate_random_community_platform_admin_feature_flags_environments_details_configuration_overrides_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformFeatureFlagEnvironmentDetailConfigurationOverride.ICreate>;
    params: {
      featureFlagId: string;
      environmentId: string;
      detailId: string;
    };
  },
): Promise<ICommunityPlatformFeatureFlagEnvironmentDetailConfigurationOverride> {
  const prepared: ICommunityPlatformFeatureFlagEnvironmentDetailConfigurationOverride.ICreate =
    prepare_random_community_platform_feature_flag_environment_detail_configuration_override(
      props.body,
    );
  const result: ICommunityPlatformFeatureFlagEnvironmentDetailConfigurationOverride =
    await api.functional.communityPlatform.admin.feature_flags.environments.details.configuration_overrides.create(
      connection,
      {
        featureFlagId: props.params.featureFlagId,
        environmentId: props.params.environmentId,
        detailId: props.params.detailId,
        body: prepared,
      },
    );
  return result;
}
