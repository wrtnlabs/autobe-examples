import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteDiscussionBoardUserArticlesArticleIdTagsTagId(props: {
  user: UserPayload;
  articleId: string & tags.Format<"uuid">;
  tagId: string & tags.Format<"uuid">;
}): Promise<void> {
  // First verify the article exists
  const article = await MyGlobal.prisma.discussion_board_articles.findFirst({
    where: {
      id: props.articleId,
      deleted_at: null,
    },
    select: { discussion_board_user_id: true },
  });
  if (!article) {
    throw new HttpException("Article not found", 404);
  }
  // Check authorization: user must own the article
  if (article.discussion_board_user_id !== props.user.id) {
    throw new HttpException(
      "You don't have permission to modify this article",
      403,
    );
  }
  // Verify the tag association exists
  const tagAssociation =
    await MyGlobal.prisma.discussion_board_article_tags.findFirst({
      where: {
        id: props.tagId,
        discussion_board_article_id: props.articleId,
        deleted_at: null,
      },
    });
  if (!tagAssociation) {
    throw new HttpException("Tag association not found", 404);
  }
  // Perform hard deletion of the tag association
  await MyGlobal.prisma.discussion_board_article_tags.delete({
    where: { id: props.tagId },
  });
}
