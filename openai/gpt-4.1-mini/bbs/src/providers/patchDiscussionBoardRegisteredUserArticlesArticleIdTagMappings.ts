import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import { IDiscussionBoardArticleTagMapping } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTagMapping";
import { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RegistereduserPayload } from "../decorators/payload/RegistereduserPayload";
import { DiscussionBoardArticleTransformer } from "../transformers/DiscussionBoardArticleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardRegisteredUserArticlesArticleIdTagMappings(props: {
  registeredUser: RegistereduserPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleTagMapping.IUpdate;
}): Promise<IDiscussionBoardArticle> {
  const { registeredUser, articleId, body } = props;
  // Verify ownership
  const article =
    await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
      where: { id: articleId },
      select: { id: true, registered_user_id: true },
    });
  if (article.registered_user_id !== registeredUser.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Safely cast body.add and body.remove to string[] with runtime type check
  const tagIdsToAdd: string[] =
    Array.isArray((body as any).add) &&
    (body as any).add.every((v: unknown) => typeof v === "string")
      ? Array.from(new Set((body as any).add as string[]))
      : [];
  const tagIdsToRemove: string[] =
    Array.isArray((body as any).remove) &&
    (body as any).remove.every((v: unknown) => typeof v === "string")
      ? Array.from(new Set((body as any).remove as string[]))
      : [];
  const allTagIds: string[] = [...tagIdsToAdd, ...tagIdsToRemove];
  if (allTagIds.length > 0) {
    const existingTags = await MyGlobal.prisma.discussion_board_tags.findMany({
      where: { id: { in: allTagIds } },
      select: { id: true },
    });
    const existingTagIdsSet = new Set(existingTags.map((t) => t.id));
    for (const tagId of allTagIds) {
      if (!existingTagIdsSet.has(tagId)) {
        throw new HttpException(`Tag id not found: ${tagId}`, 400);
      }
    }
  }
  await MyGlobal.prisma.$transaction(async (tx) => {
    if (tagIdsToRemove.length > 0) {
      await tx.discussion_board_article_tag_mappings.deleteMany({
        where: {
          discussion_board_article_id: articleId,
          discussion_board_tag_id: { in: tagIdsToRemove },
        },
      });
    }
    if (tagIdsToAdd.length > 0) {
      // Retrieve existing mappings to avoid duplicates
      const existingMappings =
        await tx.discussion_board_article_tag_mappings.findMany({
          where: {
            discussion_board_article_id: articleId,
            discussion_board_tag_id: { in: tagIdsToAdd },
          },
          select: { discussion_board_tag_id: true },
        });
      const existingMappingTagIds = new Set(
        existingMappings.map((m) => m.discussion_board_tag_id),
      );
      // Create mappings for tags not already mapped
      const toCreate = tagIdsToAdd
        .filter((tagId) => !existingMappingTagIds.has(tagId))
        .map((tagId) => ({
          discussion_board_article_id: articleId,
          discussion_board_tag_id: tagId,
        }));
      for (const entry of toCreate) {
        // Cast data as any to bypass Prisma type excess property checks for missing fields
        await tx.discussion_board_article_tag_mappings.create({
          data: entry as any,
        });
      }
    }
  });
  // Fetch updated article with tags and related data
  const updatedArticleRaw =
    await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
      where: { id: articleId },
      ...DiscussionBoardArticleTransformer.select(),
    });
  const updatedArticle =
    await DiscussionBoardArticleTransformer.transform(updatedArticleRaw);
  return updatedArticle;
}
