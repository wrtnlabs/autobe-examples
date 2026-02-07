import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { IDiscussionBoardCommentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentFlag";
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
import { DiscussionBoardCommentFlagTransformer } from "../transformers/DiscussionBoardCommentFlagTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardAdminArticlesArticleIdCommentsCommentIdFlagsFlagId(props: {
  admin: AdminPayload;
  articleId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  flagId: string & tags.Format<"uuid">;
  body: IDiscussionBoardCommentFlag.IUpdate;
}): Promise<IDiscussionBoardCommentFlag> {
  // First verify that the article, comment, and flag exist with proper relationships
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.articleId },
  });
  if (!article) {
    throw new HttpException("Article not found", 404);
  }
  const comment = await MyGlobal.prisma.discussion_board_comments.findUnique({
    where: {
      id: props.commentId,
      article: { id: props.articleId },
    },
  });
  if (!comment) {
    throw new HttpException(
      "Comment not found or does not belong to the specified article",
      404,
    );
  }
  const existingFlag =
    await MyGlobal.prisma.discussion_board_comment_flags.findUnique({
      where: {
        id: props.flagId,
        comment_id: props.commentId,
      },
      ...DiscussionBoardCommentFlagTransformer.select(),
    });
  if (!existingFlag) {
    throw new HttpException("Flag not found", 404);
  }
  // Prepare update data
  const updateData: Prisma.discussion_board_comment_flagsUpdateInput = {
    flag_reason: props.body.flag_reason,
    flag_type: props.body.flag_type,
    reviewer: { connect: { id: props.admin.id } },
  };
  // Handle optional fields
  if (props.body.status !== undefined) {
    updateData.status = props.body.status;
  }
  if (props.body.resolution_notes !== undefined) {
    updateData.resolution_notes = props.body.resolution_notes;
  }
  // Handle automatic timestamp updates based on status changes
  const currentStatus = existingFlag.status;
  const newStatus = props.body.status ?? currentStatus;
  const now = toISOStringSafe(new Date());
  if (currentStatus !== newStatus) {
    if (newStatus === "under_review" && currentStatus !== "under_review") {
      updateData.reviewed_at = now;
    }
    if (
      (newStatus === "resolved" || newStatus === "dismissed") &&
      currentStatus !== "resolved" &&
      currentStatus !== "dismissed"
    ) {
      updateData.resolved_at = now;
    }
  }
  // Update the flag
  const updatedFlag =
    await MyGlobal.prisma.discussion_board_comment_flags.update({
      where: { id: props.flagId },
      data: updateData,
      ...DiscussionBoardCommentFlagTransformer.select(),
    });
  return await DiscussionBoardCommentFlagTransformer.transform(updatedFlag);
}
