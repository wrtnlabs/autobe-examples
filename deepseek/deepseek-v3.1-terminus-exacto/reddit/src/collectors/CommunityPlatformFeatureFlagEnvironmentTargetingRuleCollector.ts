import { ICommunityPlatformFeatureFlagEnvironmentTargetingRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlagEnvironmentTargetingRule";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformFeatureFlagEnvironmentTargetingRuleCollector {
  export async function collect(props: {
    body: ICommunityPlatformFeatureFlagEnvironmentTargetingRule.ICreate;
    featureFlagEnvironment: IEntity;
  }) {
    const id: string = v4();
    return {
      // Scalar fields
      id,
      rule_key: props.body.rule_key,
      rule_value: props.body.rule_value,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // BelongsTo relation
      featureFlagEnvironment: {
        connect: { id: props.featureFlagEnvironment.id },
      },
    } satisfies Prisma.community_platform_feature_flag_environment_targeting_rulesCreateInput;
  }
}
