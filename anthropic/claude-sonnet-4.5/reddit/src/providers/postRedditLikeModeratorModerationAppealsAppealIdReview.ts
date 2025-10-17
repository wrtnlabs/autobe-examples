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

export async function postRedditLikeModeratorModerationAppealsAppealIdReview(props: {
  moderator: ModeratorPayload;
  appealId: string & tags.Format<"uuid">;
  body: IRedditLikeModerationAppeal.IReview;
}): Promise<IRedditLikeModerationAppeal> {
  const { moderator, appealId, body } = props;

  const appeal =
    await MyGlobal.prisma.reddit_like_moderation_appeals.findUniqueOrThrow({
      where: { id: appealId },
      include: {
        moderationAction: {
          include: {
            community: true,
            affectedPost: true,
            affectedComment: true,
          },
        },
        communityBan: {
          include: {
            community: true,
          },
        },
        platformSuspension: true,
      },
    });

  if (appeal.status !== "pending") {
    throw new HttpException("This appeal has already been reviewed", 400);
  }

  if (
    appeal.appeal_type === "community_ban" ||
    appeal.appeal_type === "content_removal"
  ) {
    const communityId =
      appeal.communityBan?.community.id ??
      appeal.moderationAction?.community.id;

    if (communityId) {
      const moderatorAssignment =
        await MyGlobal.prisma.reddit_like_community_moderators.findFirst({
          where: {
            community_id: communityId,
            moderator_id: moderator.id,
          },
        });

      if (!moderatorAssignment) {
        throw new HttpException(
          "Unauthorized: You can only review appeals for communities you moderate",
          403,
        );
      }
    }
  }

  const now = toISOStringSafe(new Date());
  let newStatus: string;

  if (body.decision === "uphold") {
    newStatus = "upheld";
  } else if (body.decision === "overturn") {
    newStatus = "overturned";

    if (appeal.appeal_type === "content_removal" && appeal.moderationAction) {
      if (appeal.moderationAction.affected_post_id) {
        await MyGlobal.prisma.reddit_like_posts.update({
          where: { id: appeal.moderationAction.affected_post_id },
          data: { deleted_at: null },
        });
      }

      if (appeal.moderationAction.affected_comment_id) {
        await MyGlobal.prisma.reddit_like_comments.update({
          where: { id: appeal.moderationAction.affected_comment_id },
          data: { deleted_at: null },
        });
      }
    }

    if (appeal.appeal_type === "community_ban" && appeal.community_ban_id) {
      await MyGlobal.prisma.reddit_like_community_bans.update({
        where: { id: appeal.community_ban_id },
        data: {
          is_active: false,
          updated_at: now,
        },
      });
    }

    if (
      appeal.appeal_type === "platform_suspension" &&
      appeal.platform_suspension_id
    ) {
      await MyGlobal.prisma.reddit_like_platform_suspensions.update({
        where: { id: appeal.platform_suspension_id },
        data: {
          is_active: false,
          updated_at: now,
        },
      });
    }
  } else if (body.decision === "reduce_penalty") {
    newStatus = "reduced";

    if (
      appeal.appeal_type === "community_ban" &&
      appeal.community_ban_id &&
      body.penalty_modification
    ) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      await MyGlobal.prisma.reddit_like_community_bans.update({
        where: { id: appeal.community_ban_id },
        data: {
          is_permanent: false,
          expiration_date: toISOStringSafe(futureDate),
          updated_at: now,
        },
      });
    }
  } else {
    throw new HttpException("Invalid decision type", 400);
  }

  const updated = await MyGlobal.prisma.reddit_like_moderation_appeals.update({
    where: { id: appealId },
    data: {
      status: newStatus,
      reviewer_moderator_id: moderator.id,
      decision_explanation: body.decision_explanation,
      reviewed_at: now,
      updated_at: now,
    },
  });

  return {
    id: updated.id,
    appellant_member_id: updated.appellant_member_id,
    appeal_type: updated.appeal_type,
    appeal_text: updated.appeal_text,
    status: updated.status,
    decision_explanation: updated.decision_explanation ?? undefined,
    is_escalated: updated.is_escalated,
    expected_resolution_at: toISOStringSafe(updated.expected_resolution_at),
    created_at: toISOStringSafe(updated.created_at),
    reviewed_at: updated.reviewed_at
      ? toISOStringSafe(updated.reviewed_at)
      : undefined,
  };
}
