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

export async function putDiscussionBoardAdminArticlesArticleIdCommentsCommentIdModerationsModerationId(props: {
  admin: AdminPayload;
  articleId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  moderationId: string & tags.Format<"uuid">;
  body: IDiscussionBoardCommentModeration.IUpdate;
}): Promise<IDiscussionBoardCommentModeration> {
  // First verify that the comment exists and belongs to the specified article
  const comment = await MyGlobal.prisma.discussion_board_comments.findFirst({
    where: {
      id: props.commentId,
      discussion_board_article_id: props.articleId,
    },
  });
  if (!comment) {
    throw new HttpException("Comment not found for the specified article", 404);
  }
  // Verify that the moderation record exists and belongs to the specified comment
  const existingModeration =
    await MyGlobal.prisma.discussion_board_comment_moderations.findFirst({
      where: {
        id: props.moderationId,
        discussion_board_comment_id: props.commentId,
      },
      ...DiscussionBoardCommentModerationTransformer.select(),
    });
  if (!existingModeration) {
    throw new HttpException(
      "Moderation record not found for the specified comment",
      404,
    );
  }
  // Build update data with partial update semantics
  const updateData: Prisma.discussion_board_comment_moderationsUpdateInput = {
    updated_at: toISOStringSafe(new Date().toISOString()), // Use string timestamp instead of Date
  };
  // Only update fields that are provided in the request body
  if (props.body.action_type !== undefined) {
    updateData.action_type =
      props.body.action_type === null
        ? undefined
        : { set: props.body.action_type };
  }
  if (props.body.reason !== undefined) {
    updateData.reason =
      props.body.reason === null ? undefined : { set: props.body.reason };
  }
  if (props.body.status !== undefined) {
    updateData.status =
      props.body.status === null ? undefined : { set: props.body.status };
  }
  // Perform the update
  const updatedModeration =
    await MyGlobal.prisma.discussion_board_comment_moderations.update({
      where: { id: props.moderationId },
      data: updateData,
      ...DiscussionBoardCommentModerationTransformer.select(),
    });
  // Transform and return the result
  return await DiscussionBoardCommentModerationTransformer.transform(
    updatedModeration,
  );
}
