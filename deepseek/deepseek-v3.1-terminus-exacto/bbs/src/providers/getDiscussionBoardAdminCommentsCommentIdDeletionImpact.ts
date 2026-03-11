import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardAdminCommentsCommentIdDeletionImpact(props: {
  admin: AdminPayload;
  commentId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardComment.IDeletionImpact> {
  // Check if comment exists and is not already deleted
  const comment = await MyGlobal.prisma.discussion_board_comments.findUnique({
    where: { id: props.commentId },
    select: {
      id: true,
      deleted_at: true,
    },
  });
  const exists = comment !== null && comment.deleted_at === null;
  // Check comment activities for any actions
  const activities =
    await MyGlobal.prisma.discussion_board_comment_activities.findMany({
      where: { comment_id: props.commentId },
      select: {
        action: true,
        created_at: true,
      },
    });
  // Check if comment has existing deletion records
  const deletionRecord =
    await MyGlobal.prisma.discussion_board_comment_deletions.findUnique({
      where: { discussion_board_comment_id: props.commentId },
    });
  // Determine eligibility based on business rules
  // Comment is eligible if it exists, is not deleted, and has no existing deletion record
  const eligible = exists && deletionRecord === null;
  // Generate restrictions list
  const restrictions: string[] = [];
  if (!exists) {
    restrictions.push("Comment does not exist or is already deleted");
  }
  if (deletionRecord !== null) {
    restrictions.push("Comment has existing deletion record");
  }
  // Check for recent activities (within 24 hours)
  if (activities.length > 0) {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentActivities = activities.filter(
      (activity) => activity.created_at > twentyFourHoursAgo,
    );
    if (recentActivities.length > 0) {
      restrictions.push("Comment has recent activity within 24 hours");
    }
  }
  // Calculate dependency count - in this single-level comment system, dependencies are activities
  const dependencyCount = activities.length;
  // Generate message
  let message: string | null = null;
  if (!exists) {
    message = "Comment does not exist or is already deleted";
  } else if (!eligible) {
    message =
      "Comment is not eligible for deletion due to existing restrictions";
  } else {
    message = "Comment can be deleted. No blocking dependencies found.";
  }
  return {
    exists,
    eligible,
    restrictions,
    dependencyCount: dependencyCount as number &
      tags.Type<"int32"> &
      tags.Minimum<0>,
    message: message ?? null,
  };
}
