import { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import { IPageIDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleTag";
import { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminArticlesArticleIdTags(props: {
  admin: AdminPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleTag.IRequest;
}): Promise<IPageIDiscussionBoardArticleTag.ISummary> {
  // Verify article exists
  const article =
    await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
      where: { id: props.articleId },
      select: { id: true },
    });
  // Normalize and validate tags - handle empty array as removing all tags
  const normalizedTags = [
    ...new Set(props.body.tags?.map((tag) => tag.trim().toLowerCase()) ?? []),
  ];
  const validatedTags = normalizedTags.filter(
    (tag) => tag.length >= 1 && tag.length <= 50,
  );
  // Get pagination parameters
  const page = Math.max(1, props.body.page ?? 1);
  const limit = Math.min(100, Math.max(1, props.body.limit ?? 100));
  const skip = (page - 1) * limit;
  const now = new Date();
  const nowISO = toISOStringSafe(now);
  // Perform all operations in a transaction
  const [data, total] = await MyGlobal.prisma.$transaction(async (prisma) => {
    // Get existing active tags for this article
    const existingTags = await prisma.discussion_board_article_tags.findMany({
      where: {
        discussion_board_article_id: props.articleId,
        deleted_at: null,
      },
      select: { tag_name: true, id: true },
    });
    const existingTagNames = new Set(existingTags.map((t) => t.tag_name));
    const tagsToAdd = validatedTags.filter((tag) => !existingTagNames.has(tag));
    const tagsToRemove = existingTags.filter(
      (tag) => !validatedTags.includes(tag.tag_name),
    );
    // Soft delete removed tags
    if (tagsToRemove.length > 0) {
      await prisma.discussion_board_article_tags.updateMany({
        where: {
          id: { in: tagsToRemove.map((t) => t.id) },
          discussion_board_article_id: props.articleId,
        },
        data: {
          deleted_at: nowISO,
          updated_at: nowISO,
        },
      });
    }
    // Add new tags
    if (tagsToAdd.length > 0) {
      await prisma.discussion_board_article_tags.createMany({
        data: tagsToAdd.map((tag) => ({
          id: v4(),
          discussion_board_article_id: props.articleId,
          tag_name: tag,
          created_at: nowISO,
          updated_at: nowISO,
          deleted_at: null,
        })),
      });
    }
    // Update timestamp for existing tags that remain
    if (
      existingTags.length > 0 &&
      (tagsToAdd.length > 0 || tagsToRemove.length > 0)
    ) {
      const remainingTagNames = validatedTags.filter((tag) =>
        existingTagNames.has(tag),
      );
      if (remainingTagNames.length > 0) {
        await prisma.discussion_board_article_tags.updateMany({
          where: {
            discussion_board_article_id: props.articleId,
            deleted_at: null,
            tag_name: { in: remainingTagNames },
          },
          data: { updated_at: nowISO },
        });
      }
    }
    // Return the updated tags within the transaction
    const [updatedData, updatedTotal] = await Promise.all([
      prisma.discussion_board_article_tags.findMany({
        where: {
          discussion_board_article_id: props.articleId,
          deleted_at: null,
        },
        skip,
        take: limit,
        orderBy: { tag_name: "asc" },
        select: {
          id: true,
          tag_name: true,
          created_at: true,
        },
      }),
      prisma.discussion_board_article_tags.count({
        where: {
          discussion_board_article_id: props.articleId,
          deleted_at: null,
        },
      }),
    ]);
    return [updatedData, updatedTotal];
  });
  return {
    data: data.map((tag) => ({
      id: tag.id as string & tags.Format<"uuid">,
      tag_name: tag.tag_name,
      created_at: toISOStringSafe(tag.created_at) as string &
        tags.Format<"date-time">,
    })),
    pagination: {
      current: page satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: limit satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
      records: total satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(total / limit) satisfies number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    } satisfies IPage.IPagination,
  } satisfies IPageIDiscussionBoardArticleTag.ISummary;
}
