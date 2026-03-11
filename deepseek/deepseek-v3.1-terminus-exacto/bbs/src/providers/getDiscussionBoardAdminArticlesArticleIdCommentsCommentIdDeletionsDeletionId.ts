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

export async function getDiscussionBoardAdminArticlesArticleIdCommentsCommentIdDeletionsDeletionId(props: {
  admin: AdminPayload;
  articleId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  deletionId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardCommentDeletion> {
  // Validate article exists
  await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
    where: { id: props.articleId },
  });
  // Validate comment exists and belongs to article
  await MyGlobal.prisma.discussion_board_comments.findUniqueOrThrow({
    where: {
      id: props.commentId,
      discussion_board_article_id: props.articleId,
      deleted_at: null, // Only check non-deleted comments
    },
  });
  // Get deletion record with full details using transformer select
  const deletion =
    await MyGlobal.prisma.discussion_board_comment_deletions.findUniqueOrThrow({
      where: {
        id: props.deletionId,
        discussion_board_comment_id: props.commentId,
      },
      ...DiscussionBoardCommentDeletionTransformer.select(),
    });
  return await DiscussionBoardCommentDeletionTransformer.transform(deletion);
}
