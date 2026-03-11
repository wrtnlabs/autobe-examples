import { IDiscussionBoardCommentDeletion } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentDeletion";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardCommentDeletionTransformer } from "../transformers/DiscussionBoardCommentDeletionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminArticlesArticleIdCommentsCommentIdDeletions(props: {
  admin: AdminPayload;
  articleId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: IDiscussionBoardCommentDeletion.IUpdate;
}): Promise<IDiscussionBoardCommentDeletion> {
  // 1. Verify article exists
  await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
    where: { id: props.articleId },
  });
  // 2. Verify comment exists and belongs to the article
  await MyGlobal.prisma.discussion_board_comments.findUniqueOrThrow({
    where: {
      id: props.commentId,
      discussion_board_article_id: props.articleId,
    },
  });
  // 3. Find existing deletion record for the comment
  const existingDeletion =
    await MyGlobal.prisma.discussion_board_comment_deletions.findUniqueOrThrow({
      where: { discussion_board_comment_id: props.commentId },
    });
  // 4. Prepare update data - only update reason and updated_at
  const updateData: Prisma.discussion_board_comment_deletionsUpdateInput = {
    updated_at: new Date().toISOString(),
  };
  // Only include reason if provided in body
  if (props.body.reason !== undefined) {
    // Handle null -> set to null, string -> set to value
    updateData.reason = props.body.reason;
  }
  // 5. Perform update
  await MyGlobal.prisma.discussion_board_comment_deletions.update({
    where: { id: existingDeletion.id },
    data: updateData,
  });
  // 6. Fetch updated record with transformer select
  const updated =
    await MyGlobal.prisma.discussion_board_comment_deletions.findUniqueOrThrow({
      where: { id: existingDeletion.id },
      ...DiscussionBoardCommentDeletionTransformer.select(),
    });
  // 7. Transform and return
  return await DiscussionBoardCommentDeletionTransformer.transform(updated);
}
