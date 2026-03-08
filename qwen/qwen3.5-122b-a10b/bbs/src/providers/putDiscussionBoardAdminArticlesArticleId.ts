import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardArticleTransformer } from "../transformers/DiscussionBoardArticleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardAdminArticlesArticleId(props: {
  admin: AdminPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticle.IUpdate;
}): Promise<IDiscussionBoardArticle> {
  // Find the article (404 if not found)
  await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
    where: { id: props.articleId },
  });
  // Admin can update any article (no ownership check needed)
  // Use transaction for atomic update of article and tags
  const updated = await MyGlobal.prisma.$transaction(async (tx) => {
    // Update article title and body if provided
    await tx.discussion_board_articles.update({
      where: { id: props.articleId },
      data: {
        ...(props.body.title !== undefined && { title: props.body.title }),
        ...(props.body.body !== undefined && { body: props.body.body }),
        updated_at: new Date(),
      },
    });
    // Handle tag replacement if tags provided
    if (props.body.tags !== undefined) {
      // Validate max 10 tags
      if (props.body.tags.length > 10) {
        throw new HttpException("Maximum 10 tags allowed", 400);
      }
      // Delete existing article-tag associations
      await tx.discussion_board_article_tags.deleteMany({
        where: { discussion_board_article_id: props.articleId },
      });
      // Deduplicate tag names
      const uniqueTags = [...new Set(props.body.tags)];
      // For each tag, find or create, then create association
      for (const tagName of uniqueTags) {
        // Validate tag name length (1-50 chars per DTO spec)
        if (tagName.length < 1 || tagName.length > 50) {
          throw new HttpException("Tag name must be 1-50 characters", 400);
        }
        // Find existing tag
        let tag = await tx.discussion_board_tags.findFirst({
          where: { name: tagName, deleted_at: null },
        });
        // Create tag if not exists
        if (tag === null) {
          tag = await tx.discussion_board_tags.create({
            data: {
              id: v4() as string & tags.Format<"uuid">,
              name: tagName,
              created_at: new Date(),
              updated_at: new Date(),
              deleted_at: null,
            },
          });
        }
        // Create article-tag association
        await tx.discussion_board_article_tags.create({
          data: {
            id: v4() as string & tags.Format<"uuid">,
            discussion_board_article_id: props.articleId,
            discussion_board_tag_id: tag.id,
            created_at: new Date(),
            updated_at: new Date(),
            deleted_at: null,
          },
        });
      }
    }
    // Fetch updated article with all relations for transformation
    return await tx.discussion_board_articles.findUniqueOrThrow({
      where: { id: props.articleId },
      ...DiscussionBoardArticleTransformer.select(),
    });
  });
  // Transform to DTO
  return await DiscussionBoardArticleTransformer.transform(updated);
}
