import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
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
  articleId: string;
  body: IDiscussionBoardComment.ICreate;
}): Promise<IDiscussionBoardComment> {
  // Verify article exists and is not soft-deleted
  await MyGlobal.prisma.discussion_board_articles.findFirstOrThrow({
    where: {
      id: props.articleId,
      deleted_at: null,
    },
  });
  // Create comment using collector
  const created = await MyGlobal.prisma.discussion_board_comments.create({
    data: await DiscussionBoardCommentCollector.collect({
      body: props.body,
      discussionBoardArticles: { id: props.articleId },
      discussionBoardUsers: { id: props.user.id },
      discussionBoardUserSessions: { id: props.user.session_id },
    }),
    ...DiscussionBoardCommentTransformer.select(),
  });
  // Transform and return
  return await DiscussionBoardCommentTransformer.transform(created);
}
