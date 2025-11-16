import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function deleteCommunityPlatformModeratorCommunitiesCommunityNameRulesRuleCode(props: {
  moderator: ModeratorPayload;
  communityName: string;
  ruleCode: string;
}): Promise<void> {
  // Find the community by name (and not soft-deleted)
  const community =
    await MyGlobal.prisma.community_platform_communities.findFirst({
      where: {
        name: props.communityName,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (!community) {
    throw new HttpException("Community not found", 404);
  }

  // Verify moderator assignment (active status)
  const moderatorAssignment =
    await MyGlobal.prisma.community_platform_community_moderators.findFirst({
      where: {
        community_platform_community_id: community.id,
        moderator_id: props.moderator.id,
        status: "active",
      },
      select: { id: true },
    });
  if (!moderatorAssignment) {
    throw new HttpException(
      "You are not an active moderator for this community",
      403,
    );
  }

  // Find rule by (community_id, code)
  const rule =
    await MyGlobal.prisma.community_platform_community_rules.findFirst({
      where: {
        community_platform_community_id: community.id,
        code: props.ruleCode,
      },
      select: { id: true },
    });
  if (!rule) {
    throw new HttpException("Rule not found", 404);
  }

  // Delete the rule
  await MyGlobal.prisma.community_platform_community_rules.delete({
    where: {
      id: rule.id,
    },
  });
}
