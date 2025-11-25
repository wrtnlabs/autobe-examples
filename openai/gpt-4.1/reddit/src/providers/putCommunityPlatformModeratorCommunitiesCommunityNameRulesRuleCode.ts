import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityRule";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function putCommunityPlatformModeratorCommunitiesCommunityNameRulesRuleCode(props: {
  moderator: ModeratorPayload;
  communityName: string;
  ruleCode: string;
  body: ICommunityPlatformCommunityRule.IUpdate;
}): Promise<ICommunityPlatformCommunityRule> {
  const community =
    await MyGlobal.prisma.community_platform_communities.findFirst({
      where: {
        name: props.communityName,
        deleted_at: null,
      },
    });
  if (!community) {
    throw new HttpException("Community not found.", 404);
  }
  const activeModerator =
    await MyGlobal.prisma.community_platform_community_moderators.findFirst({
      where: {
        community_platform_community_id: community.id,
        moderator_id: props.moderator.id,
        status: "active",
      },
    });
  if (!activeModerator) {
    throw new HttpException(
      "Only active moderators of this community can update rules.",
      403,
    );
  }
  const rule =
    await MyGlobal.prisma.community_platform_community_rules.findFirst({
      where: {
        community_platform_community_id: community.id,
        code: props.ruleCode,
      },
    });
  if (!rule) {
    throw new HttpException("Rule not found for this community.", 404);
  }

  const updateFields: Record<string, unknown> = {
    updated_at: toISOStringSafe(new Date()),
  };
  if (typeof props.body.description !== "undefined") {
    updateFields.description = props.body.description;
  }
  if (typeof props.body.display_order !== "undefined") {
    updateFields.display_order = props.body.display_order;
  }
  if (typeof props.body.enforced !== "undefined") {
    updateFields.enforced = props.body.enforced;
  }

  const updatedRule =
    await MyGlobal.prisma.community_platform_community_rules.update({
      where: { id: rule.id },
      data: updateFields,
    });

  return {
    id: updatedRule.id,
    code: updatedRule.code,
    description: updatedRule.description,
    display_order: updatedRule.display_order,
    enforced: updatedRule.enforced,
    community: {
      id: community.id,
      name: community.name,
      display_title: community.display_title,
      description: community.description,
      visibility: community.visibility,
      image_url: community.image_url === null ? null : community.image_url,
      status: community.status,
    },
    created_at: toISOStringSafe(updatedRule.created_at),
    updated_at: toISOStringSafe(updatedRule.updated_at),
  };
}
