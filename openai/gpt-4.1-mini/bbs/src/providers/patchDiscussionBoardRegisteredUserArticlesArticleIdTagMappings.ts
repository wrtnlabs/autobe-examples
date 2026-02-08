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
import { RegistereduserPayload } from "../decorators/payload/RegistereduserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardRegisteredUserArticlesArticleIdTagMappings(props: {
  registeredUser: RegistereduserPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleTagMapping.IPatch;
}): Promise<IPageIDiscussionBoardArticleTagMapping.ISummary> {
  const { registeredUser, articleId, body } = props;
  const tagIds: (string & tags.Format<"uuid">)[] = (body as any).tagIds ?? [];
  // Validate article existence and ownership
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: articleId },
    select: { id: true, registered_user_id: true },
  });
  if (!article) {
    throw new HttpException("Article not found", 404);
  }
  if (article.registered_user_id !== registeredUser.id) {
    const admin =
      await MyGlobal.prisma.discussion_board_administrators.findFirst({
        where: { registered_user_id: registeredUser.id },
        select: { id: true },
      });
    if (!admin) {
      throw new HttpException("Forbidden", 403);
    }
  }
  const now = toISOStringSafe(new Date()) as string & tags.Format<"date-time">;
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Delete mappings not in tagIds
    await tx.discussion_board_article_tag_mappings.deleteMany({
      where: {
        discussion_board_article_id: articleId,
        discussion_board_tag_id: { notIn: tagIds.length > 0 ? tagIds : [""] },
      },
    });
    // Find existing tag ids to prevent duplicates
    const existing = await tx.discussion_board_article_tag_mappings.findMany({
      where: { discussion_board_article_id: articleId },
      select: { discussion_board_tag_id: true },
    });
    const existingSet = new Set(
      existing.map(
        (e: { discussion_board_tag_id: string }) => e.discussion_board_tag_id,
      ),
    );
    // Insert new mappings
    const newMappings = tagIds
      .filter((id) => !existingSet.has(id))
      .map((id) => ({
        id: v4(),
        discussion_board_article_id: articleId,
        discussion_board_tag_id: id,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      }));
    if (newMappings.length > 0) {
      await tx.discussion_board_article_tag_mappings.createMany({
        data: newMappings,
      });
    }
  });
  // Pagination parameters
  const page = 1 as number & tags.Type<"int32"> & tags.Minimum<0>;
  const limit = 100 as number & tags.Type<"int32"> & tags.Minimum<0>;
  const skip = 0;
  // Fetch updated mappings
  const data =
    await MyGlobal.prisma.discussion_board_article_tag_mappings.findMany({
      where: { discussion_board_article_id: articleId },
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        tag: { select: { id: true, name: true } },
      },
    });
  // Count total mappings
  const total =
    await MyGlobal.prisma.discussion_board_article_tag_mappings.count({
      where: { discussion_board_article_id: articleId },
    });
  return {
    data: data.map((item) => ({
      id: item.id as string & tags.Format<"uuid">,
      created_at: item.created_at,
      updated_at: item.updated_at,
      deleted_at: item.deleted_at === null ? null : item.deleted_at,
      tag: {
        id: item.tag.id as string & tags.Format<"uuid">,
        name: item.tag.name,
      },
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages:
        total === 0
          ? 0
          : (Math.ceil(total / limit) as number &
              tags.Type<"int32"> &
              tags.Minimum<0>),
    },
  };
}
