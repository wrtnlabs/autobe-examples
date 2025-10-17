import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditLikeModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerationAppeal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function getRedditLikeModeratorModerationAppealsAppealId(props: {
  moderator: ModeratorPayload;
  appealId: string & tags.Format<"uuid">;
}): Promise<IRedditLikeModerationAppeal> {
  const { moderator, appealId } = props;

  // Fetch the appeal with related entities for authorization checks
  const appeal =
    await MyGlobal.prisma.reddit_like_moderation_appeals.findUniqueOrThrow({
      where: { id: appealId },
      include: {
        moderationAction: {
          select: {
            community_id: true,
          },
        },
        communityBan: {
          select: {
            community_id: true,
          },
        },
      },
    });

  // Platform suspension appeals can only be accessed by admins, not moderators
  if (appeal.appeal_type === "platform_suspension") {
    throw new HttpException(
      "Unauthorized: Platform suspension appeals can only be accessed by administrators",
      403,
    );
  }

  // Determine the community ID based on appeal type and related entities
  let communityId: string | undefined = undefined;

  if (appeal.appeal_type === "content_removal" && appeal.moderationAction) {
    communityId = appeal.moderationAction.community_id;
  } else if (appeal.appeal_type === "community_ban" && appeal.communityBan) {
    communityId = appeal.communityBan.community_id;
  }

  // If we can't determine community context, deny access
  if (!communityId) {
    throw new HttpException(
      "Unauthorized: Cannot determine community context for this appeal",
      403,
    );
  }

  // Verify moderator has access to this community
  const moderatorAssignment =
    await MyGlobal.prisma.reddit_like_community_moderators.findFirst({
      where: {
        community_id: communityId,
        moderator_id: moderator.id,
      },
    });

  if (!moderatorAssignment) {
    throw new HttpException(
      "Unauthorized: You can only access appeals for communities you moderate",
      403,
    );
  }

  // Map to DTO with proper type conversions
  return {
    id: appeal.id,
    appellant_member_id: appeal.appellant_member_id,
    appeal_type: appeal.appeal_type,
    appeal_text: appeal.appeal_text,
    status: appeal.status,
    decision_explanation:
      appeal.decision_explanation === null
        ? undefined
        : appeal.decision_explanation,
    is_escalated: appeal.is_escalated,
    expected_resolution_at: toISOStringSafe(appeal.expected_resolution_at),
    created_at: toISOStringSafe(appeal.created_at),
    reviewed_at: appeal.reviewed_at
      ? toISOStringSafe(appeal.reviewed_at)
      : undefined,
  };
}
