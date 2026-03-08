import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardCommentTransformer } from "../transformers/DiscussionBoardCommentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardArticlesArticleIdCommentsCommentId(props: {
  articleId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardComment> {
  const comment =
    await MyGlobal.prisma.discussion_board_comments.findUniqueOrThrow({
      where: { id: props.commentId },
      ...DiscussionBoardCommentTransformer.select(),
    });
  if (comment.article.id !== props.articleId) {
    throw new HttpException("Comment not found", 404);
  }
  if (comment.deleted_at !== null) {
    throw new HttpException("Comment not found", 404);
  }
  if (comment.article.deleted_at !== null) {
    throw new HttpException("Article not found", 404);
  }
  return await DiscussionBoardCommentTransformer.transform(comment);
}
