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
import { DiscussionBoardCommentFlagCollector } from "../collectors/DiscussionBoardCommentFlagCollector";
import { UserPayload } from "../decorators/payload/UserPayload";
import { DiscussionBoardCommentFlagTransformer } from "../transformers/DiscussionBoardCommentFlagTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardUserArticlesArticleIdCommentsCommentIdFlags(props: {
  user: UserPayload;
  articleId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: IDiscussionBoardCommentFlag.ICreate;
}): Promise<IDiscussionBoardCommentFlag> {
  // Validate that article exists
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.articleId },
  });
  if (!article) {
    throw new HttpException("Article not found", 404);
  }
  // Validate that comment exists and belongs to the article
  const comment = await MyGlobal.prisma.discussion_board_comments.findUnique({
    where: { id: props.commentId },
    select: { discussion_board_article_id: true },
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
  // Create flag using collector
  const created = await MyGlobal.prisma.discussion_board_comment_flags.create({
    data: await DiscussionBoardCommentFlagCollector.collect({
      body: props.body,
      discussionBoardUsers: { id: props.user.id } as IEntity,
      discussionBoardComments: { id: props.commentId } as IEntity,
    }),
    ...DiscussionBoardCommentFlagTransformer.select(),
  });
  return await DiscussionBoardCommentFlagTransformer.transform(created);
}
