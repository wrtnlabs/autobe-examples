import { ICommunityPlatformFeatureFlagEnvironmentTargetingRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlagEnvironmentTargetingRule";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace CommunityPlatformFeatureFlagEnvironmentTargetingRuleAtSummaryTransformer {
  export type Payload =
    Prisma.community_platform_feature_flag_environment_targeting_rulesGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        rule_key: true,
        rule_value: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        featureFlagEnvironment: true,
      },
    } satisfies Prisma.community_platform_feature_flag_environment_targeting_rulesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformFeatureFlagEnvironmentTargetingRule.ISummary> {
    return {
      id: input.id,
      rule_key: input.rule_key,
      rule_value: input.rule_value,
      created_at: input.created_at.toISOString(),
    };
  }
}
