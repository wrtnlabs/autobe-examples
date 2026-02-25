import { ICommunityPlatformFeatureFlagTargetingRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlagTargetingRule";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformFeatureFlagTargetingRuleCollector {
  export async function collect(props: {
    body: ICommunityPlatformFeatureFlagTargetingRule.ICreate;
    communityPlatformFeatureFlags: IEntity;
  }) {
    const id: string = v4();
    return {
      // Generated fields
      id,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // Direct DTO mappings
      rule_key: props.body.rule_key,
      rule_value: props.body.rule_value,
      rule_operator: props.body.rule_operator,
      description: props.body.description ?? null,
      is_active: props.body.is_active ?? true,
      priority: props.body.priority ?? 0,
      // BelongsTo relation
      featureFlag: { connect: { id: props.communityPlatformFeatureFlags.id } },
    } satisfies Prisma.community_platform_feature_flag_targeting_rulesCreateInput;
  }
}
