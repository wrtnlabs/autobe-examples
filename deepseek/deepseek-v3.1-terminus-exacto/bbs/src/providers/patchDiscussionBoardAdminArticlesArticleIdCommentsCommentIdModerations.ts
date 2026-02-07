import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { IDiscussionBoardCommentModeration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentModeration";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardCommentModerationTransformer } from "../transformers/DiscussionBoardCommentModerationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminArticlesArticleIdCommentsCommentIdModerations(props: {
  admin: AdminPayload;
  articleId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: IDiscussionBoardCommentModeration.IUpdate;
}): Promise<IDiscussionBoardCommentModeration> {
  // Validate that the comment exists and belongs to the article
  const comment = await MyGlobal.prisma.discussion_board_comments.findUnique({
    where: { id: props.commentId },
    select: { id: true, discussion_board_article_id: true },
  });
  if (!comment) {
    throw new HttpException("Comment not found", 404);
  }
  if (comment.discussion_board_article_id !== props.articleId) {
    throw new HttpException(
      "Comment does not belong to the specified article",
      400,
    );
  }
  // Validate that the moderation record exists for this comment
  const existingModeration =
    await MyGlobal.prisma.discussion_board_comment_moderations.findFirst({
      where: {
        discussion_board_comment_id: props.commentId,
      },
    });
  if (!existingModeration) {
    throw new HttpException(
      "Moderation record not found for this comment",
      404,
    );
  }
  // Validate status transitions
  if (props.body.status) {
    const validTransitions: Record<string, string[]> = {
      pending: ["completed", "reversed"],
      completed: ["reversed"],
      reversed: [],
    };
    const currentStatus = existingModeration.status;
    const newStatus = props.body.status;
    if (
      currentStatus !== newStatus &&
      !validTransitions[currentStatus]?.includes(newStatus)
    ) {
      throw new HttpException(
        `Invalid status transition from ${currentStatus} to ${newStatus}`,
        400,
      );
    }
  }
  // Build update data with proper null handling
  const updateData: Prisma.discussion_board_comment_moderationsUpdateInput = {};
  if (props.body.action_type !== undefined && props.body.action_type !== null) {
    updateData.action_type = { set: props.body.action_type };
  }
  if (props.body.reason !== undefined && props.body.reason !== null) {
    updateData.reason = { set: props.body.reason };
  }
  if (props.body.status !== undefined && props.body.status !== null) {
    updateData.status = { set: props.body.status };
  }
  updateData.updated_at = { set: toISOStringSafe(new Date()) };
  // Update the moderation record
  const updated =
    await MyGlobal.prisma.discussion_board_comment_moderations.update({
      where: { id: existingModeration.id },
      data: updateData,
      ...DiscussionBoardCommentModerationTransformer.select(),
    });
  return await DiscussionBoardCommentModerationTransformer.transform(updated);
}
