import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlag";
import type { ICommunityPlatformFeatureFlagEnvironment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlagEnvironment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_platform_feature_flag_environment } from "../prepare/prepare_random_community_platform_feature_flag_environment";

export async function generate_random_community_platform_admin_feature_flags_environments_create(
  connection: api.IConnection,
  props: {
    body?:
      | DeepPartial<ICommunityPlatformFeatureFlagEnvironment.ICreate>
      | undefined;
    params: {
      featureFlagId: string;
    };
  },
): Promise<ICommunityPlatformFeatureFlagEnvironment> {
  const prepared: ICommunityPlatformFeatureFlagEnvironment.ICreate =
    prepare_random_community_platform_feature_flag_environment(props.body);
  return await api.functional.communityPlatform.admin.feature_flags.environments.create(
    connection,
    {
      body: prepared,
      featureFlagId: props.params.featureFlagId,
    },
  );
}
