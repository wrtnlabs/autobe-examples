import { ICommunityPlatformFeatureFlagEnvironmentTargetingRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlagEnvironmentTargetingRule";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformFeatureFlagEnvironmentTargetingRuleTransformer } from "../transformers/CommunityPlatformFeatureFlagEnvironmentTargetingRuleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformAdminFeatureFlagsFeatureFlagIdEnvironmentsEnvironmentIdDetailsDetailIdTargetingRulesTargetingRuleId(props: {
  admin: AdminPayload;
  featureFlagId: string & tags.Format<"uuid">;
  environmentId: string & tags.Format<"uuid">;
  detailId: string & tags.Format<"uuid">;
  targetingRuleId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformFeatureFlagEnvironmentTargetingRule> {
  // Verify feature flag exists
  await MyGlobal.prisma.community_platform_feature_flags.findUniqueOrThrow({
    where: { id: props.featureFlagId, deleted_at: null },
  });
  // Verify environment exists and belongs to feature flag
  await MyGlobal.prisma.community_platform_feature_flag_environments.findUniqueOrThrow(
    {
      where: {
        id: props.environmentId,
        feature_flag_id: props.featureFlagId,
        deleted_at: null,
      },
    },
  );
  // Verify detail exists and belongs to environment
  await MyGlobal.prisma.community_platform_feature_flag_environment_details.findUniqueOrThrow(
    {
      where: {
        id: props.detailId,
        community_platform_feature_flag_environment_id: props.environmentId,
        community_platform_feature_flag_id: props.featureFlagId,
      },
    },
  );
  // Retrieve the targeting rule with transformer
  const targetingRule =
    await MyGlobal.prisma.community_platform_feature_flag_environment_targeting_rules.findUniqueOrThrow(
      {
        where: {
          id: props.targetingRuleId,
          community_platform_feature_flag_environment_id: props.environmentId,
        },
        ...CommunityPlatformFeatureFlagEnvironmentTargetingRuleTransformer.select(),
      },
    );
  return CommunityPlatformFeatureFlagEnvironmentTargetingRuleTransformer.transform(
    targetingRule,
  );
}
