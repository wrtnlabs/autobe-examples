import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardCommentCollector } from "../collectors/DiscussionBoardCommentCollector";
import { UserPayload } from "../decorators/payload/UserPayload";
import { DiscussionBoardCommentTransformer } from "../transformers/DiscussionBoardCommentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardUserArticlesArticleIdComments(props: {
  user: UserPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardComment.ICreate;
}): Promise<IDiscussionBoardComment> {
  // Validate article exists and is not deleted
  await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
    where: { id: props.articleId, deleted_at: null },
  });
  // Rate limiting: check comments in last hour (50 max)
  const oneHourAgo = toISOStringSafe(new Date(Date.now() - 60 * 60 * 1000));
  const recentComments = await MyGlobal.prisma.discussion_board_comments.count({
    where: {
      discussion_board_user_id: props.user.id,
      created_at: { gte: oneHourAgo },
    },
  });
  if (recentComments >= 50) {
    throw new HttpException(
      "Rate limit exceeded: maximum 50 comments per hour",
      429,
    );
  }
  // Content validation (business rule: minimum 1 character)
  if (props.body.content.trim().length === 0) {
    throw new HttpException("Comment content must not be empty", 400);
  }
  // Create comment using Collector with proper reference mapping
  const created = await MyGlobal.prisma.discussion_board_comments.create({
    data: await DiscussionBoardCommentCollector.collect({
      body: props.body,
      discussionBoardUsers: { id: props.user.id },
      discussionBoardUserSessions: { id: props.user.session_id },
      discussionBoardArticles: { id: props.articleId },
    }),
    ...DiscussionBoardCommentTransformer.select(),
  });
  // Transform and return using Transformer
  return await DiscussionBoardCommentTransformer.transform(created);
}
