import { ICommunityPlatformFeatureFlagEnvironmentDetailTargetingRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlagEnvironmentDetailTargetingRule";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace CommunityPlatformFeatureFlagEnvironmentDetailTargetingRuleTransformer {
  export type Payload =
    Prisma.community_platform_feature_flag_environment_detail_targeting_rulesGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        rule_key: true,
        rule_value: true,
        rule_operator: true,
        rule_order: true,
        is_active: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        featureFlagEnvironmentDetail: {
          select: {
            id: true,
          },
        } satisfies Prisma.community_platform_feature_flag_environment_detailsFindManyArgs,
      },
    } satisfies Prisma.community_platform_feature_flag_environment_detail_targeting_rulesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformFeatureFlagEnvironmentDetailTargetingRule> {
    return {
      id: input.id,
      ruleKey: input.rule_key,
      ruleValue: input.rule_value,
      ruleOperator: input.rule_operator,
      ruleOrder: input.rule_order,
      isActive: input.is_active,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at ? input.deleted_at.toISOString() : null,
    };
  }
}
