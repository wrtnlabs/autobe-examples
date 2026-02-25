import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformFeatureFlagTargetingRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlagTargetingRule";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_platform_feature_flag_targeting_rule } from "../prepare/prepare_random_community_platform_feature_flag_targeting_rule";

export async function generate_random_community_platform_admin_feature_flags_targeting_rules_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformFeatureFlagTargetingRule.ICreate>;
    params: {
      featureFlagId: string;
    };
  },
): Promise<ICommunityPlatformFeatureFlagTargetingRule> {
  const prepared: ICommunityPlatformFeatureFlagTargetingRule.ICreate =
    prepare_random_community_platform_feature_flag_targeting_rule(props.body);
  const result: ICommunityPlatformFeatureFlagTargetingRule =
    await api.functional.communityPlatform.admin.feature_flags.targeting_rules.create(
      connection,
      {
        featureFlagId: props.params.featureFlagId,
        body: prepared,
      },
    );
  return result;
}
