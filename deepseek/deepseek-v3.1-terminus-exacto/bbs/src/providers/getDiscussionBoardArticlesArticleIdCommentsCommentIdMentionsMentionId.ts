import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { IDiscussionBoardCommentMention } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentMention";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardCommentMentionTransformer } from "../transformers/DiscussionBoardCommentMentionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardArticlesArticleIdCommentsCommentIdMentionsMentionId(props: {
  articleId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  mentionId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardCommentMention> {
  // Retrieve the mention with comment validation in a single query
  const mention =
    await MyGlobal.prisma.discussion_board_comment_mentions.findUnique({
      where: {
        id: props.mentionId,
        comment: {
          id: props.commentId,
          discussion_board_article_id: props.articleId,
        },
      },
      ...DiscussionBoardCommentMentionTransformer.select(),
    });
  if (!mention) {
    throw new HttpException(
      "Mention not found or does not belong to the specified comment and article",
      404,
    );
  }
  return await DiscussionBoardCommentMentionTransformer.transform(mention);
}
