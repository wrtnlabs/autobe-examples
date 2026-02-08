import { IDiscussionBoardArticleTagMapping } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTagMapping";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardArticleTagMapping } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleTagMapping";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdministratorArticlesArticleIdTagMappings(props: {
  administrator: AdministratorPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleTagMapping.IPatch;
}): Promise<IPageIDiscussionBoardArticleTagMapping.ISummary> {
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.articleId },
    select: { id: true, author: { select: { id: true } } },
  });
  if (!article) throw new HttpException("Article not found", 404);
  const administratorId = typia.assert<string & tags.Format<"uuid">>(
    props.administrator.id,
  );
  if (article.author.id !== administratorId) {
    throw new HttpException("Forbidden", 403);
  }
  const tag_ids =
    (
      props.body as
        | {
            tags: (string & tags.Format<"uuid">)[];
          }
        | undefined
    )?.tags ?? [];
  return await MyGlobal.prisma.$transaction(async (prisma) => {
    const existingMappings =
      await prisma.discussion_board_article_tag_mappings.findMany({
        where: { discussion_board_article_id: props.articleId },
        select: { discussion_board_tag_id: true },
      });
    const existingTagIds = new Set(
      existingMappings.map((m) => m.discussion_board_tag_id),
    );
    const inputTagIds = new Set(tag_ids);
    const tagsToRemove = Array.from(existingTagIds).filter(
      (id) => !inputTagIds.has(id),
    );
    const tagsToAdd = Array.from(inputTagIds).filter(
      (id) => !existingTagIds.has(id),
    );
    if (tagsToRemove.length > 0) {
      await prisma.discussion_board_article_tag_mappings.deleteMany({
        where: {
          discussion_board_article_id: props.articleId,
          discussion_board_tag_id: { in: tagsToRemove },
        },
      });
    }
    if (tagsToAdd.length > 0) {
      const now = new Date();
      const nowString = toISOStringSafe(now);
      await prisma.discussion_board_article_tag_mappings.createMany({
        data: tagsToAdd.map((tagId) => ({
          id: v4(),
          discussion_board_article_id: props.articleId,
          discussion_board_tag_id: tagId,
          created_at: nowString,
          updated_at: nowString,
        })),
      });
    }
    const updatedMappings =
      await prisma.discussion_board_article_tag_mappings.findMany({
        where: { discussion_board_article_id: props.articleId },
        select: {
          id: true,
          discussion_board_article_id: true,
          discussion_board_tag_id: true,
        },
      });
    const tagIds = updatedMappings.map((m) => m.discussion_board_tag_id);
    const tags = await prisma.discussion_board_tags.findMany({
      where: { id: { in: tagIds } },
      select: { id: true, name: true },
    });
    const tagMap = new Map(tags.map((t) => [t.id, t]));
    return {
      pagination: {
        current: 1,
        limit: updatedMappings.length,
        records: updatedMappings.length,
        pages: 1,
      },
      data: updatedMappings.map((m) => ({
        id: m.id,
        article_id: m.discussion_board_article_id,
        tag_id: m.discussion_board_tag_id,
        tag: {
          id: tagMap.get(m.discussion_board_tag_id)?.id ?? "",
          name: tagMap.get(m.discussion_board_tag_id)?.name ?? "",
        },
      })),
    };
  });
}
