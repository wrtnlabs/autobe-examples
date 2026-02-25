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

export async function putCommunityPlatformAdminFeatureFlagsFeatureFlagIdEnvironmentsEnvironmentIdTargetingRulesTargetingRuleId(props: {
  admin: AdminPayload;
  featureFlagId: string & tags.Format<"uuid">;
  environmentId: string & tags.Format<"uuid">;
  targetingRuleId: string & tags.Format<"uuid">;
  body: ICommunityPlatformFeatureFlagTargetingRule.IUpdate;
}): Promise<ICommunityPlatformFeatureFlagTargetingRule> {
  // Validate feature flag exists
  await MyGlobal.prisma.community_platform_feature_flags.findUniqueOrThrow({
    where: { id: props.featureFlagId },
  });
  // Validate environment exists and belongs to feature flag
  await MyGlobal.prisma.community_platform_feature_flag_environments.findUniqueOrThrow(
    {
      where: {
        id: props.environmentId,
      },
    },
  );
  // Validate targeting rule exists and belongs to feature flag
  await MyGlobal.prisma.community_platform_feature_flag_targeting_rules.findUniqueOrThrow(
    {
      where: {
        id: props.targetingRuleId,
      },
    },
  );
  // Update targeting rule with partial data
  const updateData: Prisma.community_platform_feature_flag_targeting_rulesUpdateInput =
    {
      updated_at: new Date(),
    };
  if (props.body.rule_key !== undefined) {
    updateData.rule_key = props.body.rule_key;
  }
  if (props.body.rule_value !== undefined) {
    updateData.rule_value = props.body.rule_value;
  }
  if (props.body.rule_operator !== undefined) {
    updateData.rule_operator = props.body.rule_operator;
  }
  if (props.body.description !== undefined) {
    updateData.description = props.body.description;
  }
  if (props.body.is_active !== undefined) {
    updateData.is_active = props.body.is_active;
  }
  if (props.body.priority !== undefined) {
    updateData.priority = props.body.priority;
  }
  await MyGlobal.prisma.community_platform_feature_flag_targeting_rules.update({
    where: { id: props.targetingRuleId },
    data: updateData,
  });
  // Fetch updated targeting rule with transformer
  const updatedRule =
    await MyGlobal.prisma.community_platform_feature_flag_targeting_rules.findUniqueOrThrow(
      {
        where: { id: props.targetingRuleId },
        ...CommunityPlatformFeatureFlagTargetingRuleTransformer.select(),
      },
    );
  return await CommunityPlatformFeatureFlagTargetingRuleTransformer.transform(
    updatedRule,
  );
}
