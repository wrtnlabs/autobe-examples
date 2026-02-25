import { ICommunityPlatformFeatureFlagTargetingRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlagTargetingRule";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformFeatureFlagTargetingRuleTransformer } from "../transformers/CommunityPlatformFeatureFlagTargetingRuleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformAdminFeatureFlagsFeatureFlagIdTargetingRulesTargetingRuleId(props: {
  admin: AdminPayload;
  featureFlagId: string & tags.Format<"uuid">;
  targetingRuleId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformFeatureFlagTargetingRule> {
  // Find the targeting rule and ensure it belongs to the correct feature flag
  const rule =
    await MyGlobal.prisma.community_platform_feature_flag_targeting_rules.findUniqueOrThrow(
      {
        where: {
          id: props.targetingRuleId,
          community_platform_feature_flag_id: props.featureFlagId,
          deleted_at: null, // Only retrieve non-deleted rules
        },
        ...CommunityPlatformFeatureFlagTargetingRuleTransformer.select(),
      },
    );
  // Transform database record to DTO
  return await CommunityPlatformFeatureFlagTargetingRuleTransformer.transform(
    rule,
  );
}
