import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardSuperAdminCommentsCommentIdDeletionImpact(props: {
  superAdmin: SuperadminPayload;
  commentId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardComment.IDeletionImpact> {
  // 1. Check comment existence and deletion status
  const comment =
    await MyGlobal.prisma.discussion_board_comments.findUniqueOrThrow({
      where: { id: props.commentId },
      select: {
        id: true,
        deleted_at: true,
      },
    });
  const exists = comment.deleted_at === null;
  const restrictions: string[] = [];
  if (!exists) {
    return {
      exists: false,
      eligible: false,
      restrictions: ["Comment is already deleted"],
      dependencyCount: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
      message: "Comment does not exist or is already deleted",
    };
  }
  // 2. Count dependencies sequentially
  const activityCount =
    await MyGlobal.prisma.discussion_board_comment_activities.count({
      where: { comment_id: props.commentId },
    });
  const snapshotCount =
    await MyGlobal.prisma.discussion_board_comment_snapshots.count({
      where: { discussion_board_comment_id: props.commentId },
    });
  const tagCount = await MyGlobal.prisma.discussion_board_comment_tags.count({
    where: { discussion_board_comment_id: props.commentId },
  });
  const dependencyCount = activityCount + snapshotCount + tagCount;
  // 3. Check for any activity to provide more specific restrictions
  if (activityCount > 0) {
    const latestActivity =
      await MyGlobal.prisma.discussion_board_comment_activities.findFirst({
        where: { comment_id: props.commentId },
        orderBy: { created_at: "desc" },
      });
    if (latestActivity) {
      // Convert activity timestamp to Date for comparison (temporary, just for logic)
      const activityDate = latestActivity.created_at;
      const now = new Date(); // Temporary for logic
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      if (activityDate > sevenDaysAgo) {
        restrictions.push(
          `Recent activity (${latestActivity.action}) within last 7 days`,
        );
      } else {
        restrictions.push(
          `Has ${activityCount} activity record(s) including ${latestActivity.action}`,
        );
      }
    }
  }
  // 4. Check for snapshots (edit history)
  if (snapshotCount > 0) {
    restrictions.push(`Has ${snapshotCount} edit snapshot(s) in history`);
  }
  // 5. Check for tags
  if (tagCount > 0) {
    restrictions.push(`Has ${tagCount} associated tag(s)`);
  }
  // 6. Determine eligibility - super admin can delete despite restrictions, but we track them
  const eligible = exists; // Super admin can delete any existing comment
  // 7. Construct message
  let message: string | null = null;
  if (restrictions.length === 0) {
    message = "No restrictions - comment can be deleted";
  } else {
    const restrictionText = restrictions.join(", ").toLowerCase();
    message = `Comment has ${restrictions.length} restriction(s): ${restrictionText}. Super administrator can override.`;
  }
  return {
    exists: true,
    eligible,
    restrictions,
    dependencyCount: dependencyCount as number &
      tags.Type<"int32"> &
      tags.Minimum<0>,
    message,
  };
}
