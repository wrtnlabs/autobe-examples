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

export async function putDiscussionBoardSuperAdminArticlesArticleIdCommentsCommentIdModerationsModerationId(props: {
  superAdmin: SuperadminPayload;
  articleId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  moderationId: string & tags.Format<"uuid">;
  body: IDiscussionBoardCommentModeration.IUpdate;
}): Promise<IDiscussionBoardCommentModeration> {
  // Validate that all entities exist and are properly linked
  const moderationRecord =
    await MyGlobal.prisma.discussion_board_comment_moderations.findFirst({
      where: {
        id: props.moderationId,
        comment: {
          id: props.commentId,
          discussion_board_article_id: props.articleId,
        },
      },
      ...DiscussionBoardCommentModerationTransformer.select(),
    });
  if (!moderationRecord) {
    throw new HttpException(
      "Moderation record not found or invalid article/comment reference",
      404,
    );
  }
  // Build update data with partial update semantics
  const updateData: Prisma.discussion_board_comment_moderationsUpdateInput = {
    updated_at: toISOStringSafe(new Date()),
  };
  // Handle each field - database schema shows these fields are NOT nullable
  if (props.body.action_type !== undefined && props.body.action_type !== null) {
    updateData.action_type = props.body.action_type;
  }
  if (props.body.reason !== undefined && props.body.reason !== null) {
    updateData.reason = props.body.reason;
  }
  if (props.body.status !== undefined && props.body.status !== null) {
    updateData.status = props.body.status;
  }
  // Check if any fields were actually provided to update
  const hasUpdates = Object.keys(updateData).length > 1; // More than just updated_at
  if (!hasUpdates) {
    // No fields to update, return current record
    return await DiscussionBoardCommentModerationTransformer.transform(
      moderationRecord,
    );
  }
  // Perform the update
  const updated =
    await MyGlobal.prisma.discussion_board_comment_moderations.update({
      where: { id: props.moderationId },
      data: updateData,
      ...DiscussionBoardCommentModerationTransformer.select(),
    });
  return await DiscussionBoardCommentModerationTransformer.transform(updated);
}
