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

export async function putCommunityPlatformAdminFeatureFlagsFeatureFlagIdTargetingRulesTargetingRuleId(props: {
  admin: AdminPayload;
  featureFlagId: string & tags.Format<"uuid">;
  targetingRuleId: string & tags.Format<"uuid">;
  body: ICommunityPlatformFeatureFlagTargetingRule.IUpdate;
}): Promise<ICommunityPlatformFeatureFlagTargetingRule> {
  // Verify targeting rule exists and belongs to the specified feature flag
  const existingRule =
    await MyGlobal.prisma.community_platform_feature_flag_targeting_rules.findUniqueOrThrow(
      {
        where: {
          id: props.targetingRuleId,
          community_platform_feature_flag_id: props.featureFlagId,
          deleted_at: null,
        },
      },
    );
  // Check for unique constraint violation if rule_key or rule_value are being updated
  if (
    props.body.rule_key !== undefined ||
    props.body.rule_value !== undefined
  ) {
    const conflictingRule =
      await MyGlobal.prisma.community_platform_feature_flag_targeting_rules.findFirst(
        {
          where: {
            id: { not: props.targetingRuleId },
            community_platform_feature_flag_id: props.featureFlagId,
            rule_key: props.body.rule_key ?? existingRule.rule_key,
            rule_value: props.body.rule_value ?? existingRule.rule_value,
            deleted_at: null,
          },
        },
      );
    if (conflictingRule) {
      throw new HttpException(
        "A targeting rule with this key-value combination already exists for this feature flag",
        400,
      );
    }
  }
  // Prepare update data with only provided fields
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
    updateData.description =
      props.body.description === null ? null : props.body.description;
  }
  if (props.body.is_active !== undefined) {
    updateData.is_active = props.body.is_active;
  }
  if (props.body.priority !== undefined) {
    updateData.priority = props.body.priority;
  }
  // Perform the update
  await MyGlobal.prisma.community_platform_feature_flag_targeting_rules.update({
    where: { id: props.targetingRuleId },
    data: updateData,
  });
  // Retrieve the updated record with transformer select
  const updatedRule =
    await MyGlobal.prisma.community_platform_feature_flag_targeting_rules.findUniqueOrThrow(
      {
        where: { id: props.targetingRuleId },
        ...CommunityPlatformFeatureFlagTargetingRuleTransformer.select(),
      },
    );
  // Transform and return the response
  return await CommunityPlatformFeatureFlagTargetingRuleTransformer.transform(
    updatedRule,
  );
}
