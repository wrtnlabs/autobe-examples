import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
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
import { DiscussionBoardArticleTagTransformer } from "../transformers/DiscussionBoardArticleTagTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardArticlesArticleIdTags(props: {
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleTag.IModifyTag;
}): Promise<IDiscussionBoardArticleTag> {
  // Verify article exists
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.articleId },
  });
  if (!article) {
    throw new HttpException("Article not found", 404);
  }
  // Validate tag names length
  if (props.body.add) {
    for (const tagName of props.body.add) {
      if (tagName.length > 20) {
        throw new HttpException(
          `Tag name "${tagName}" exceeds maximum length of 20 characters`,
          400,
        );
      }
    }
  }
  if (props.body.remove) {
    for (const tagName of props.body.remove) {
      if (tagName.length > 20) {
        throw new HttpException(
          `Tag name "${tagName}" exceeds maximum length of 20 characters`,
          400,
        );
      }
    }
  }
  // Use transaction for atomic operations
  const result = await MyGlobal.prisma.$transaction(async (tx) => {
    const now = toISOStringSafe(new Date());
    // Handle remove operations
    if (props.body.remove && props.body.remove.length > 0) {
      await tx.discussion_board_article_tags.updateMany({
        where: {
          discussion_board_article_id: props.articleId,
          tag_name: { in: props.body.remove },
          deleted_at: null,
        },
        data: {
          deleted_at: now,
          updated_at: now,
        },
      });
    }
    // Handle add operations
    if (props.body.add && props.body.add.length > 0) {
      for (const tagName of props.body.add) {
        // Check if tag already exists (active or soft-deleted)
        const existingTag = await tx.discussion_board_article_tags.findFirst({
          where: {
            discussion_board_article_id: props.articleId,
            tag_name: tagName,
          },
        });
        if (existingTag) {
          // Reactivate soft-deleted tag or update existing
          await tx.discussion_board_article_tags.update({
            where: { id: existingTag.id },
            data: {
              deleted_at: null,
              updated_at: now,
            },
          });
        } else {
          // Create new tag association
          await tx.discussion_board_article_tags.create({
            data: {
              id: v4(),
              discussion_board_article_id: props.articleId,
              tag_name: tagName,
              created_at: now,
              updated_at: now,
            },
          });
        }
      }
    }
    // Return the first active tag for the article
    const updatedTag = await tx.discussion_board_article_tags.findFirst({
      where: {
        discussion_board_article_id: props.articleId,
        deleted_at: null,
      },
      ...DiscussionBoardArticleTagTransformer.select(),
    });
    return updatedTag;
  });
  if (!result) {
    // If no tags remain after operations, we need to handle this case
    // Since the operation returns IDiscussionBoardArticleTag, we might need to create a dummy response
    // or reconsider the return type. For now, throw an error.
    throw new HttpException(
      "No active tags found for article after modification",
      404,
    );
  }
  return await DiscussionBoardArticleTagTransformer.transform(result);
}
