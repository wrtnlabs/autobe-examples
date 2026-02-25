import { IDiscussionBoardMvTagUsageStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMvTagUsageStat";
import { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardMvTagUsageStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardMvTagUsageStat";
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

export async function patchDiscussionBoardAdministratorTagUsageStats(props: {
  administrator: AdministratorPayload;
  body: IDiscussionBoardMvTagUsageStat.IRequest;
}): Promise<IPageIDiscussionBoardMvTagUsageStat.ISummary> {
  const {
    search,
    articleCountMin,
    articleCountMax,
    commentCountMin,
    commentCountMax,
    page = 1,
    limit = 20,
    sortKey = "tagName",
  } = props.body;
  if (page < 1) {
    throw new HttpException("Page must be 1 or greater", 400);
  }
  if (limit < 1 || limit > 100) {
    throw new HttpException("Limit must be between 1 and 100", 400);
  }
  const where: Prisma.discussion_board_mv_tag_usage_statsWhereInput = {};
  if (search !== undefined && search !== null && search.trim() !== "") {
    where.tag = { name: { contains: search.trim(), mode: "insensitive" } };
  }
  if (articleCountMin !== undefined && articleCountMax !== undefined) {
    where.article_count = { gte: articleCountMin, lte: articleCountMax };
  } else if (articleCountMin !== undefined) {
    where.article_count = { gte: articleCountMin };
  } else if (articleCountMax !== undefined) {
    where.article_count = { lte: articleCountMax };
  }
  if (commentCountMin !== undefined && commentCountMax !== undefined) {
    where.comment_count = { gte: commentCountMin, lte: commentCountMax };
  } else if (commentCountMin !== undefined) {
    where.comment_count = { gte: commentCountMin };
  } else if (commentCountMax !== undefined) {
    where.comment_count = { lte: commentCountMax };
  }
  const skip = (page - 1) * limit;
  const orderBy:
    | Prisma.discussion_board_mv_tag_usage_statsOrderByWithRelationInput[]
    | undefined =
    sortKey === "articleCount"
      ? [{ article_count: "desc" }]
      : sortKey === "commentCount"
        ? [{ comment_count: "desc" }]
        : [{ tag: { name: "asc" } }];
  const dataRaw =
    await MyGlobal.prisma.discussion_board_mv_tag_usage_stats.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: { tag: true },
    });
  const total = await MyGlobal.prisma.discussion_board_mv_tag_usage_stats.count(
    { where },
  );
  const data: IDiscussionBoardMvTagUsageStat.ISummary[] = dataRaw.map(
    (record) => ({
      id: record.id as string & tags.Format<"uuid">,
      articleCount: record.article_count,
      commentCount: record.comment_count,
      refreshedAt: toISOStringSafe(record.refreshed_at) as string &
        tags.Format<"date-time">,
      tag: {
        id: record.tag.id as string & tags.Format<"uuid">,
        name: record.tag.name,
        createdAt: toISOStringSafe(record.tag.created_at) as string &
          tags.Format<"date-time">,
        updatedAt: toISOStringSafe(record.tag.updated_at) as string &
          tags.Format<"date-time">,
        deletedAt:
          record.tag.deleted_at === null
            ? null
            : (toISOStringSafe(record.tag.deleted_at) as
                | (string & tags.Format<"date-time">)
                | null),
      } satisfies IDiscussionBoardTag.ISummary,
    }),
  );
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
    data,
  };
}
