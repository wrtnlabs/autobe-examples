import { ICommunityPlatformFeatureFlagTargetingRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlagTargetingRule";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace CommunityPlatformFeatureFlagTargetingRuleTransformer {
  export type Payload =
    Prisma.community_platform_feature_flag_targeting_rulesGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        rule_key: true,
        rule_value: true,
        rule_operator: true,
        description: true,
        is_active: true,
        priority: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        featureFlag: {
          select: {
            id: true,
          },
        } satisfies Prisma.community_platform_feature_flagsFindManyArgs,
      },
    } satisfies Prisma.community_platform_feature_flag_targeting_rulesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformFeatureFlagTargetingRule> {
    return {
      id: input.id,
      rule_key: input.rule_key,
      rule_value: input.rule_value,
      rule_operator: input.rule_operator,
      description: input.description ?? undefined,
      is_active: input.is_active,
      priority: input.priority,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
