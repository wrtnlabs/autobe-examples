import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityRule";
import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformCommunityRuleTransformer } from "../transformers/CommunityPlatformCommunityRuleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityPlatformAdminCommunitiesCommunityIdRulesRuleId(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  ruleId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityRule.IUpdate;
}): Promise<ICommunityPlatformCommunityRule> {
  // First, verify the rule exists and belongs to the specified community
  const existingRule =
    await MyGlobal.prisma.community_platform_community_rules.findUnique({
      where: {
        id: props.ruleId,
        community_platform_community_id: props.communityId,
        deleted_at: null,
      },
    });
  if (!existingRule) {
    throw new HttpException("Rule not found in the specified community", 404);
  }
  // If rule_order is being updated, check for uniqueness within the community
  if (
    props.body.rule_order !== undefined &&
    props.body.rule_order !== existingRule.rule_order
  ) {
    const conflictingRule =
      await MyGlobal.prisma.community_platform_community_rules.findFirst({
        where: {
          community_platform_community_id: props.communityId,
          rule_order: props.body.rule_order,
          deleted_at: null,
          id: { not: props.ruleId },
        },
      });
    if (conflictingRule) {
      throw new HttpException(
        "Rule order must be unique within the community",
        400,
      );
    }
  }
  // Validate rule_text length if provided
  if (props.body.rule_text !== undefined) {
    if (props.body.rule_text.length < 1 || props.body.rule_text.length > 5000) {
      throw new HttpException(
        "Rule text must be between 1 and 5000 characters",
        400,
      );
    }
  }
  // Validate rule_order if provided
  if (props.body.rule_order !== undefined && props.body.rule_order < 1) {
    throw new HttpException("Rule order must be a positive integer", 400);
  }
  // Prepare update data with proper typing
  const updateData: Prisma.community_platform_community_rulesUpdateInput = {
    updated_at: new Date(),
  };
  if (props.body.rule_text !== undefined) {
    updateData.rule_text = props.body.rule_text;
  }
  if (props.body.rule_order !== undefined) {
    updateData.rule_order = props.body.rule_order;
  }
  if (props.body.is_active !== undefined) {
    updateData.is_active = props.body.is_active;
  }
  // Update the rule
  const updatedRule =
    await MyGlobal.prisma.community_platform_community_rules.update({
      where: { id: props.ruleId },
      data: updateData,
      ...CommunityPlatformCommunityRuleTransformer.select(),
    });
  // Transform and return the updated rule
  return await CommunityPlatformCommunityRuleTransformer.transform(updatedRule);
}
