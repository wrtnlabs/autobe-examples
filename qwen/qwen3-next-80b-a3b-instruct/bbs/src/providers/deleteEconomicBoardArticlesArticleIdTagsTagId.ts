import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteEconomicBoardArticlesArticleIdTagsTagId(props: {
  articleId: string;
  tagId: string;
}): Promise<void> {
  const { articleId, tagId } = props;
  // Use transaction for atomicity
  await MyGlobal.prisma.$transaction(async (prisma) => {
    // Verify article exists and is not deleted
    const article = await prisma.economic_board_articles.findUnique({
      where: { id: articleId },
      select: { id: true, deleted_at: true },
    });
    if (!article) {
      throw new HttpException("Article not found", 404);
    }
    if (article.deleted_at !== null) {
      throw new HttpException("Article not found", 404);
    }
    // Verify tag exists
    const tag = await prisma.economic_board_search_tags.findUnique({
      where: { id: tagId },
      select: { id: true },
    });
    if (!tag) {
      throw new HttpException("Tag not found", 404);
    }
    // Find the specific relationship
    const relationship =
      await prisma.economic_board_search_article_tags.findUnique({
        where: {
          article_id_tag_id: {
            article_id: articleId,
            tag_id: tagId,
          },
        },
        select: { id: true },
      });
    if (!relationship) {
      throw new HttpException(
        "The relationship between article and tag does not exist",
        404,
      );
    }
    // Delete the relationship
    await prisma.economic_board_search_article_tags.delete({
      where: {
        article_id_tag_id: {
          article_id: articleId,
          tag_id: tagId,
        },
      },
    });
  });
}
