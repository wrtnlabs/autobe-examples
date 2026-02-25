import { ICommunityPlatformFeatureFlagEnvironmentDetailTargetingRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlagEnvironmentDetailTargetingRule";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformFeatureFlagEnvironmentDetailTargetingRuleTransformer } from "../transformers/CommunityPlatformFeatureFlagEnvironmentDetailTargetingRuleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityPlatformAdminFeatureFlagsFeatureFlagIdEnvironmentsEnvironmentIdDetailsDetailIdTargetingRulesTargetingRuleId(props: {
  admin: AdminPayload;
  featureFlagId: string & tags.Format<"uuid">;
  environmentId: string & tags.Format<"uuid">;
  detailId: string & tags.Format<"uuid">;
  targetingRuleId: string & tags.Format<"uuid">;
  body: ICommunityPlatformFeatureFlagEnvironmentDetailTargetingRule.IUpdate;
}): Promise<ICommunityPlatformFeatureFlagEnvironmentDetailTargetingRule> {
  // Validate hierarchy: feature flag → environment → detail → targeting rule
  const featureFlag =
    await MyGlobal.prisma.community_platform_feature_flags.findUniqueOrThrow({
      where: { id: props.featureFlagId },
    });
  // Verify feature flag is not deleted
  if (featureFlag.deleted_at !== null) {
    throw new HttpException("Feature flag not found", 404);
  }
  const environment =
    await MyGlobal.prisma.community_platform_feature_flag_environments.findUniqueOrThrow(
      {
        where: { id: props.environmentId },
      },
    );
  // Verify environment belongs to feature flag and is not deleted
  if (
    environment.feature_flag_id !== props.featureFlagId ||
    environment.deleted_at !== null
  ) {
    throw new HttpException("Environment not found", 404);
  }
  const detail =
    await MyGlobal.prisma.community_platform_feature_flag_environment_details.findUniqueOrThrow(
      {
        where: { id: props.detailId },
      },
    );
  // Verify detail belongs to environment and is not deleted
  if (
    detail.community_platform_feature_flag_environment_id !==
    props.environmentId
  ) {
    throw new HttpException("Detail not found", 404);
  }
  const existingRule =
    await MyGlobal.prisma.community_platform_feature_flag_environment_detail_targeting_rules.findUniqueOrThrow(
      {
        where: { id: props.targetingRuleId },
      },
    );
  // Verify targeting rule belongs to detail and is not deleted
  if (
    existingRule.community_platform_feature_flag_environment_detail_id !==
      props.detailId ||
    existingRule.deleted_at !== null
  ) {
    throw new HttpException("Targeting rule not found", 404);
  }
  // Build update data with only provided fields
  const updateData: Prisma.community_platform_feature_flag_environment_detail_targeting_rulesUpdateInput =
    {
      ...(props.body.rule_key !== undefined && {
        rule_key: props.body.rule_key,
      }),
      ...(props.body.rule_value !== undefined && {
        rule_value: props.body.rule_value,
      }),
      ...(props.body.rule_operator !== undefined && {
        rule_operator: props.body.rule_operator,
      }),
      ...(props.body.rule_order !== undefined && {
        rule_order: props.body.rule_order,
      }),
      ...(props.body.is_active !== undefined && {
        is_active: props.body.is_active,
      }),
      updated_at: new Date(),
    };
  // Perform the update
  await MyGlobal.prisma.community_platform_feature_flag_environment_detail_targeting_rules.update(
    {
      where: { id: props.targetingRuleId },
      data: updateData,
    },
  );
  // Retrieve updated rule with transformer
  const updatedRule =
    await MyGlobal.prisma.community_platform_feature_flag_environment_detail_targeting_rules.findUniqueOrThrow(
      {
        where: { id: props.targetingRuleId },
        ...CommunityPlatformFeatureFlagEnvironmentDetailTargetingRuleTransformer.select(),
      },
    );
  return await CommunityPlatformFeatureFlagEnvironmentDetailTargetingRuleTransformer.transform(
    updatedRule,
  );
}
