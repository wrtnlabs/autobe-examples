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
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardCommentModerationTransformer } from "../transformers/DiscussionBoardCommentModerationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdminArticlesArticleIdCommentsCommentIdModerations(props: {
  superAdmin: SuperadminPayload;
  articleId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: IDiscussionBoardCommentModeration.IUpdate;
}): Promise<IDiscussionBoardCommentModeration> {
  // Validate that the comment exists and belongs to the article
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
  // Validate that the moderation record exists
  const existingModeration =
    await MyGlobal.prisma.discussion_board_comment_moderations.findFirst({
      where: {
        discussion_board_comment_id: props.commentId,
        discussion_board_admin_id: props.superAdmin.id,
      },
    });
  if (!existingModeration) {
    throw new HttpException("Moderation record not found", 404);
  }
  // Prepare update data with proper typing
  const updateData: Prisma.discussion_board_comment_moderationsUpdateInput = {
    updated_at: toISOStringSafe(new Date()),
  };
  // Apply partial updates only for provided fields using Prisma set operation
  if (props.body.action_type !== undefined) {
    updateData.action_type = props.body.action_type ?? undefined;
  }
  if (props.body.reason !== undefined) {
    updateData.reason = props.body.reason ?? undefined;
  }
  if (props.body.status !== undefined) {
    updateData.status = props.body.status ?? undefined;
  }
  // Perform the update
  const updated =
    await MyGlobal.prisma.discussion_board_comment_moderations.update({
      where: { id: existingModeration.id },
      data: updateData,
      ...DiscussionBoardCommentModerationTransformer.select(),
    });
  return await DiscussionBoardCommentModerationTransformer.transform(updated);
}
