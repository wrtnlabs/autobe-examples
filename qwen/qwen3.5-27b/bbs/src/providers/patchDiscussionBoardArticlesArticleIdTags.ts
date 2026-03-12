import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
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
import { DiscussionBoardArticleTagTransformer } from "../transformers/DiscussionBoardArticleTagTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardArticlesArticleIdTags(props: {
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleTag.IUpdate;
}): Promise<IDiscussionBoardArticleTag> {
  // Verify article exists and is not soft-deleted
  await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
    where: {
      id: props.articleId,
      deleted_at: null,
    },
    select: { id: true },
  });
  // Execute tag update operations within a transaction
  const tags = await MyGlobal.prisma.$transaction(async (tx) => {
    // Add new tags
    if (props.body.tagsToAdd?.length) {
      for (const tagName of props.body.tagsToAdd) {
        // Skip empty tag names
        if (!tagName.trim()) continue;
        // Look up existing tag or create new one
        let tag = await tx.discussion_board_tags.findFirst({
          where: { name: tagName, deleted_at: null },
        });
        if (!tag) {
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
        // Create the article-tag relationship, ignoring duplicates
        try {
          await tx.discussion_board_article_tags.create({
            data: {
              id: v4() as string & tags.Format<"uuid">,
              discussion_board_article_id: props.articleId,
              discussion_board_tag_id: tag.id,
              created_at: new Date(),
            },
          });
        } catch (error) {
          // Silently handle unique constraint violations (tag already assigned)
          if (
            !(
              error instanceof Prisma.PrismaClientKnownRequestError &&
              error.code === "P2002"
            )
          ) {
            throw error;
          }
        }
      }
    }
    // Remove specified tags
    if (props.body.tagsToRemove?.length) {
      await tx.discussion_board_article_tags.deleteMany({
        where: {
          discussion_board_article_id: props.articleId,
          discussion_board_tag_id: { in: props.body.tagsToRemove },
        },
      });
    }
    // Fetch all tags for this article
    return tx.discussion_board_article_tags.findMany({
      where: { discussion_board_article_id: props.articleId },
      ...DiscussionBoardArticleTagTransformer.select(),
    });
  });
  // Return the first tag from the updated collection
  return await DiscussionBoardArticleTagTransformer.transform(tags[0]);
}
