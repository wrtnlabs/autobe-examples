import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformFeatureFlagEnvironmentTargetingRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlagEnvironmentTargetingRule";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_platform_feature_flag_environment_targeting_rule } from "../prepare/prepare_random_community_platform_feature_flag_environment_targeting_rule";

export async function generate_random_community_platform_admin_feature_flags_environments_targeting_rules_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformFeatureFlagEnvironmentTargetingRule.ICreate>;
    params: {
      featureFlagId: string & tags.Format<"uuid">;
      environmentId: string & tags.Format<"uuid">;
    };
  },
): Promise<ICommunityPlatformFeatureFlagEnvironmentTargetingRule> {
  const prepared: ICommunityPlatformFeatureFlagEnvironmentTargetingRule.ICreate =
    prepare_random_community_platform_feature_flag_environment_targeting_rule(
      props.body,
    );
  const result: ICommunityPlatformFeatureFlagEnvironmentTargetingRule =
    await api.functional.communityPlatform.admin.feature_flags.environments.targeting_rules.create(
      connection,
      {
        featureFlagId: props.params.featureFlagId,
        environmentId: props.params.environmentId,
        body: prepared,
      },
    );
  return result;
}
