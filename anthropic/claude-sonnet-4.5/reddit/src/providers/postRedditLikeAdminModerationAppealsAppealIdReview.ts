import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditLikeModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerationAppeal";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postRedditLikeAdminModerationAppealsAppealIdReview(props: {
  admin: AdminPayload;
  appealId: string & tags.Format<"uuid">;
  body: IRedditLikeModerationAppeal.IReview;
}): Promise<IRedditLikeModerationAppeal> {
  const { admin, appealId, body } = props;

  const appeal =
    await MyGlobal.prisma.reddit_like_moderation_appeals.findUnique({
      where: { id: appealId },
      include: {
        moderationAction: true,
        communityBan: true,
        platformSuspension: true,
      },
    });

  if (!appeal) {
    throw new HttpException("Appeal not found", 404);
  }

  if (appeal.status !== "pending" && appeal.status !== "under_review") {
    throw new HttpException(
      `Appeal cannot be reviewed - current status is ${appeal.status}`,
      400,
    );
  }

  const validDecisions = ["uphold", "overturn", "reduce_penalty"];
  if (!validDecisions.includes(body.decision)) {
    throw new HttpException(
      `Invalid decision type. Must be one of: ${validDecisions.join(", ")}`,
      400,
    );
  }

  if (appeal.appeal_type === "community_ban" && !appeal.is_escalated) {
    throw new HttpException(
      "Administrators can only review escalated community appeals",
      403,
    );
  }

  let newStatus: string;
  if (body.decision === "uphold") {
    newStatus = "upheld";
  } else if (body.decision === "overturn") {
    newStatus = "overturned";
  } else {
    newStatus = "reduced";
  }

  const now = toISOStringSafe(new Date());

  if (body.decision === "overturn") {
    if (appeal.moderation_action_id && appeal.moderationAction) {
      if (appeal.moderationAction.affected_post_id) {
        await MyGlobal.prisma.reddit_like_posts.update({
          where: { id: appeal.moderationAction.affected_post_id },
          data: { deleted_at: null, updated_at: now },
        });
      }

      if (appeal.moderationAction.affected_comment_id) {
        await MyGlobal.prisma.reddit_like_comments.update({
          where: { id: appeal.moderationAction.affected_comment_id },
          data: { deleted_at: null, updated_at: now },
        });
      }

      await MyGlobal.prisma.reddit_like_moderation_actions.update({
        where: { id: appeal.moderation_action_id },
        data: { status: "reversed", updated_at: now },
      });
    }

    if (appeal.community_ban_id && appeal.communityBan) {
      await MyGlobal.prisma.reddit_like_community_bans.update({
        where: { id: appeal.community_ban_id },
        data: { is_active: false, deleted_at: now, updated_at: now },
      });
    }

    if (appeal.platform_suspension_id && appeal.platformSuspension) {
      await MyGlobal.prisma.reddit_like_platform_suspensions.update({
        where: { id: appeal.platform_suspension_id },
        data: { is_active: false, deleted_at: now, updated_at: now },
      });
    }
  } else if (body.decision === "reduce_penalty") {
    if (
      appeal.community_ban_id &&
      appeal.communityBan &&
      body.penalty_modification
    ) {
      await MyGlobal.prisma.reddit_like_community_bans.update({
        where: { id: appeal.community_ban_id },
        data: { updated_at: now },
      });
    }

    if (
      appeal.platform_suspension_id &&
      appeal.platformSuspension &&
      body.penalty_modification
    ) {
      await MyGlobal.prisma.reddit_like_platform_suspensions.update({
        where: { id: appeal.platform_suspension_id },
        data: { updated_at: now },
      });
    }
  }

  const updatedAppeal =
    await MyGlobal.prisma.reddit_like_moderation_appeals.update({
      where: { id: appealId },
      data: {
        status: newStatus,
        decision_explanation: body.decision_explanation,
        reviewer_admin_id: admin.id,
        reviewed_at: now,
        updated_at: now,
      },
    });

  return {
    id: updatedAppeal.id,
    appellant_member_id: updatedAppeal.appellant_member_id,
    appeal_type: updatedAppeal.appeal_type,
    appeal_text: updatedAppeal.appeal_text,
    status: updatedAppeal.status,
    decision_explanation:
      updatedAppeal.decision_explanation !== null
        ? updatedAppeal.decision_explanation
        : undefined,
    is_escalated: updatedAppeal.is_escalated,
    expected_resolution_at: toISOStringSafe(
      updatedAppeal.expected_resolution_at,
    ),
    created_at: toISOStringSafe(updatedAppeal.created_at),
    reviewed_at:
      updatedAppeal.reviewed_at !== null
        ? toISOStringSafe(updatedAppeal.reviewed_at)
        : undefined,
  };
}
