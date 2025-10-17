import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function deleteRedditLikeModeratorCommunitiesCommunityIdRulesRuleId(props: {
  moderator: ModeratorPayload;
  communityId: string & tags.Format<"uuid">;
  ruleId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { moderator, communityId, ruleId } = props;

  // Step 1: Verify moderator has manage_settings permission for this community
  const moderatorAssignment =
    await MyGlobal.prisma.reddit_like_community_moderators.findFirst({
      where: {
        community_id: communityId,
        moderator_id: moderator.id,
      },
    });

  if (!moderatorAssignment) {
    throw new HttpException(
      "Unauthorized: You are not a moderator of this community",
      403,
    );
  }

  // Check permissions: primary moderators have all permissions
  if (!moderatorAssignment.is_primary) {
    const permissions = moderatorAssignment.permissions;
    let hasManageSettings = false;

    // Try parsing as JSON array
    try {
      const permissionsArray = JSON.parse(permissions);
      hasManageSettings =
        Array.isArray(permissionsArray) &&
        permissionsArray.includes("manage_settings");
    } catch {
      // Fall back to comma-separated string check
      hasManageSettings = permissions.includes("manage_settings");
    }

    if (!hasManageSettings) {
      throw new HttpException(
        "Unauthorized: You do not have manage_settings permission for this community",
        403,
      );
    }
  }

  // Step 2: Verify the rule exists and belongs to the specified community
  const rule = await MyGlobal.prisma.reddit_like_community_rules.findUnique({
    where: { id: ruleId },
  });

  if (!rule) {
    throw new HttpException("Rule not found", 404);
  }

  if (rule.community_id !== communityId) {
    throw new HttpException(
      "Rule does not belong to the specified community",
      400,
    );
  }

  // Step 3: Permanently delete the rule
  await MyGlobal.prisma.reddit_like_community_rules.delete({
    where: { id: ruleId },
  });
}
