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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { DiscussionBoardArticleTransformer } from "../transformers/DiscussionBoardArticleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdministratorArticlesArticleIdTagMappings(props: {
  administrator: AdministratorPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleTagMapping.IUpdate;
}): Promise<IDiscussionBoardArticle> {
  const { articleId, body } = props;
  // Validate article existence
  await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
    where: { id: articleId },
  });
  await MyGlobal.prisma.$transaction(async (prisma) => {
    // Remove tag mappings
    const removeIds = Array.isArray((body as any).remove)
      ? ((body as any).remove as string[])
      : [];
    if (removeIds.length > 0) {
      await prisma.discussion_board_article_tag_mappings.deleteMany({
        where: {
          discussion_board_article_id: articleId,
          discussion_board_tag_id: { in: removeIds },
        },
      });
    }
    // Add new tag mappings
    const addIds = Array.isArray((body as any).add)
      ? ((body as any).add as string[])
      : [];
    if (addIds.length > 0) {
      const uniqueAddTags = Array.from(new Set(addIds));
      // Verify existence of tags
      const existingTags = await prisma.discussion_board_article_tags.findMany({
        where: { id: { in: uniqueAddTags } },
        select: { id: true },
      });
      const existingTagIds = new Set(existingTags.map((tag) => tag.id));
      const validTagIdsToAdd = uniqueAddTags.filter((tagId) =>
        existingTagIds.has(tagId),
      );
      if (validTagIdsToAdd.length === 0) return;
      // Find existing mappings to avoid duplicates
      const existingMappings =
        await prisma.discussion_board_article_tag_mappings.findMany({
          where: {
            discussion_board_article_id: articleId,
            discussion_board_tag_id: { in: validTagIdsToAdd },
          },
          select: { discussion_board_tag_id: true },
        });
      const existingMappingTagIds = new Set(
        existingMappings.map((m) => m.discussion_board_tag_id),
      );
      const tagIdsToCreate = validTagIdsToAdd.filter(
        (tagId) => !existingMappingTagIds.has(tagId),
      );
      const currentTimestamp = toISOStringSafe(new Date());
      const createData = tagIdsToCreate.map((tagId) => ({
        id: v4(),
        discussion_board_article_id: articleId,
        discussion_board_tag_id: tagId,
        created_at: currentTimestamp,
        updated_at: currentTimestamp,
        deleted_at: null,
      }));
      if (createData.length > 0) {
        await prisma.discussion_board_article_tag_mappings.createMany({
          data: createData,
          skipDuplicates: true,
        });
      }
    }
  });
  // Retrieve updated article with relations to return
  const updatedArticle =
    await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
      where: { id: articleId },
      ...DiscussionBoardArticleTransformer.select(),
    });
  return DiscussionBoardArticleTransformer.transform(updatedArticle);
}
