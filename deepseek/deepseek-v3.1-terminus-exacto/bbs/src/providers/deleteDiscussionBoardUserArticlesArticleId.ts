import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
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
import { UserPayload } from "../decorators/payload/UserPayload";
import { DiscussionBoardArticleTransformer } from "../transformers/DiscussionBoardArticleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteDiscussionBoardUserArticlesArticleId(props: {
  user: UserPayload;
  articleId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardArticle> {
  // Check if article exists and user has permission
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.articleId },
    ...DiscussionBoardArticleTransformer.select(),
  });
  if (!article) {
    throw new HttpException("Article not found", 404);
  }
  // Check if user is the article owner
  const isOwner = article.author.id === props.user.id;
  if (!isOwner) {
    // Check if user has admin privileges
    const admin =
      await MyGlobal.prisma.discussion_board_administrators.findFirst({
        where: {
          user_id: props.user.id,
          deleted_at: null,
        },
      });
    if (!admin) {
      throw new HttpException("Forbidden", 403);
    }
  }
  const currentTimestamp = toISOStringSafe(new Date());
  // Perform soft deletion with cascading to related entities
  const deletedArticle = await MyGlobal.prisma.$transaction(async (tx) => {
    // Soft delete the article
    const updatedArticle = await tx.discussion_board_articles.update({
      where: { id: props.articleId },
      data: {
        deleted_at: currentTimestamp,
        updated_at: currentTimestamp,
      },
      ...DiscussionBoardArticleTransformer.select(),
    });
    // Cascade deletion to comments
    await tx.discussion_board_comments.updateMany({
      where: { discussion_board_article_id: props.articleId },
      data: {
        deleted_at: currentTimestamp,
        updated_at: currentTimestamp,
      },
    });
    // Cascade deletion to article files
    await tx.discussion_board_article_files.updateMany({
      where: { discussion_board_article_id: props.articleId },
      data: {
        deleted_at: currentTimestamp,
        updated_at: currentTimestamp,
      },
    });
    // Cascade deletion to article images - use deleteMany since it doesn't have soft deletion
    await tx.discussion_board_article_images.deleteMany({
      where: { discussion_board_article_id: props.articleId },
    });
    // Cascade deletion to article tags
    await tx.discussion_board_article_tags.updateMany({
      where: { discussion_board_article_id: props.articleId },
      data: {
        deleted_at: currentTimestamp,
        updated_at: currentTimestamp,
      },
    });
    // Remove article favorites
    await tx.discussion_board_article_favorites.deleteMany({
      where: { discussion_board_article_id: props.articleId },
    });
    return updatedArticle;
  });
  return await DiscussionBoardArticleTransformer.transform(deletedArticle);
}
