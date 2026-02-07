import { IEconomicBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardArticle";
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

export async function postEconomicBoardArticlesArticleIdTags(props: {
  articleId: string;
  body: IEconomicBoardArticle.ITagsCreate;
}): Promise<IEconomicBoardArticle.ITag> {
  // Validate article exists and is not deleted
  const article = await MyGlobal.prisma.economic_board_articles.findUnique({
    where: { id: props.articleId },
    select: {
      id: true,
      economic_board_citizen_id: true,
      deleted_at: true,
      author: true,
    },
  });
  if (!article) {
    throw new HttpException("Article not found", 404);
  }
  if (article.deleted_at) {
    throw new HttpException("Article has been deleted", 404);
  }
  // Validate that tags array is provided and is array of strings
  if (
    !Array.isArray(props.body) ||
    props.body.length === 0 ||
    !props.body.every((tag) => typeof tag === "string")
  ) {
    throw new HttpException(
      "Tags must be provided as non-empty array of strings",
      400,
    );
  }
  // Normalize and validate each tag
  const normalizedTags = props.body
    .map((tag) => tag.trim().toLowerCase())
    .filter((tag) => tag.length > 0 && tag.length <= 50);
  // Verify we won't exceed 10 tags total
  const currentTagCount =
    await MyGlobal.prisma.economic_board_search_article_tags.count({
      where: { article_id: props.articleId },
    });
  if (currentTagCount + normalizedTags.length > 10) {
    throw new HttpException("Cannot add more than 10 tags to an article", 400);
  }
  // Process each tag: ensure existence in search_tags, create if needed
  const tagIds: (string & tags.Format<"uuid">)[] = [];
  for (const tagText of normalizedTags) {
    // Check if tag already exists in search_tags table
    let tag = await MyGlobal.prisma.economic_board_search_tags.findUnique({
      where: { text: tagText },
    });
    // Create tag if it doesn't exist
    if (!tag) {
      tag = await MyGlobal.prisma.economic_board_search_tags.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          text: tagText,
          created_at: toISOStringSafe(new Date()) as string &
            tags.Format<"date-time">,
          updated_at: toISOStringSafe(new Date()) as string &
            tags.Format<"date-time">,
        },
      });
    }
    tagIds.push(tag.id);
  }
  // Avoid duplicate associations in junction table
  const existingAssociations =
    await MyGlobal.prisma.economic_board_search_article_tags.findMany({
      where: {
        article_id: props.articleId,
        tag_id: { in: tagIds },
      },
      select: { tag_id: true },
    });
  const existingTagIds = existingAssociations.map((a) => a.tag_id);
  const newTagIds = tagIds.filter((id) => !existingTagIds.includes(id));
  // Create new associations
  if (newTagIds.length > 0) {
    await MyGlobal.prisma.economic_board_search_article_tags.createMany({
      data: newTagIds.map((tagId) => ({
        id: v4() as string & tags.Format<"uuid">,
        article_id: props.articleId as string & tags.Format<"uuid">,
        tag_id: tagId,
      })),
    });
  }
  // Return all current tags on the article, sorted alphabetically
  const articleTags =
    await MyGlobal.prisma.economic_board_search_article_tags.findMany({
      where: { article_id: props.articleId },
      include: {
        tag: true,
      },
      orderBy: { tag: { text: "asc" } },
    });
  return articleTags.map((at) => at.tag.text) as IEconomicBoardArticle.ITag;
}
