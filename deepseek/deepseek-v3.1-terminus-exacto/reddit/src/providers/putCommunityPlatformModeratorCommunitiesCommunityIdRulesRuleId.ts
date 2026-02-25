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
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { CommunityPlatformCommunityRuleTransformer } from "../transformers/CommunityPlatformCommunityRuleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function putCommunityPlatformModeratorCommunitiesCommunityIdRulesRuleId(props: {
  moderator: ModeratorPayload;
  communityId: string & tags.Format<"uuid">;
  ruleId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityRule.IUpdate;
}): Promise<ICommunityPlatformCommunityRule> {
  // Verify moderator exists (soft-delete safe)
  const moderator =
    await MyGlobal.prisma.community_platform_moderators.findUnique({
      where: {
        id: props.moderator.id,
        deleted_at: null,
        is_active: true,
      },
    });
  if (!moderator) {
    throw new HttpException("Forbidden", 403);
  }
  // Verify community exists (soft-delete safe)
  const community =
    await MyGlobal.prisma.community_platform_communities.findUnique({
      where: {
        id: props.communityId,
        deleted_at: null,
      },
    });
  if (!community) {
    throw new HttpException("Community not found", 404);
  }
  // Verify moderator is assigned to this community
  const assignment =
    await MyGlobal.prisma.community_platform_moderator_assignments.findFirst({
      where: {
        community_id: props.communityId,
        assigned_user_id: props.moderator.id,
        deleted_at: null,
      },
    });
  if (!assignment) {
    throw new HttpException("Forbidden", 403);
  }
  // Ensure rule exists in this community
  const existingRule =
    await MyGlobal.prisma.community_platform_community_rules.findUnique({
      where: {
        id: props.ruleId,
        community_platform_community_id: props.communityId,
      },
    });
  if (!existingRule) {
    throw new HttpException("Rule not found", 404);
  }
  // Validate rule_order uniqueness within community if provided
  if (props.body.rule_order !== undefined) {
    const conflicting =
      await MyGlobal.prisma.community_platform_community_rules.findFirst({
        where: {
          community_platform_community_id: props.communityId,
          rule_order: props.body.rule_order,
          id: { not: props.ruleId },
          deleted_at: null,
        },
      });
    if (conflicting) {
      throw new HttpException("Rule order already in use", 400);
    }
  }
  // Build update data with only provided fields
  const updateData: Prisma.community_platform_community_rulesUpdateInput = {};
  if (props.body.rule_text !== undefined) {
    updateData.rule_text = props.body.rule_text;
  }
  if (props.body.rule_order !== undefined) {
    updateData.rule_order = props.body.rule_order;
  }
  if (props.body.is_active !== undefined) {
    updateData.is_active = props.body.is_active;
  }
  // Always update the timestamp
  updateData.updated_at = new Date();
  // Perform update
  await MyGlobal.prisma.community_platform_community_rules.update({
    where: { id: props.ruleId },
    data: updateData,
  });
  // Fetch and return updated rule with proper transformer
  const updated =
    await MyGlobal.prisma.community_platform_community_rules.findUniqueOrThrow({
      where: { id: props.ruleId },
      ...CommunityPlatformCommunityRuleTransformer.select(),
    });
  return await CommunityPlatformCommunityRuleTransformer.transform(updated);
}
