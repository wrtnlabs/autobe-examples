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

export async function patchDiscussionBoardAdministratorTagsUsageStats(props: {
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
    sortKey = "articleCount",
  } = props.body;
  const take = limit > 100 ? 100 : limit;
  const skip = (page - 1) * take;
  const where: any = {
    AND: [
      ...(search
        ? [
            {
              tag: {
                is: {
                  name: {
                    contains: search,
                    // mode removed to fix Prisma QueryMode incompatibility
                  },
                },
              },
            },
          ]
        : []),
      ...(articleCountMin !== undefined
        ? [{ article_count: { gte: articleCountMin } }]
        : []),
      ...(articleCountMax !== undefined
        ? [{ article_count: { lte: articleCountMax } }]
        : []),
      ...(commentCountMin !== undefined
        ? [{ comment_count: { gte: commentCountMin } }]
        : []),
      ...(commentCountMax !== undefined
        ? [{ comment_count: { lte: commentCountMax } }]
        : []),
    ],
  };
  let orderBy:
    | Record<string, "asc" | "desc">
    | {
        tag: {
          name: "asc" | "desc";
        };
      };
  if (sortKey === "articleCount") {
    orderBy = { article_count: "desc" } satisfies Record<
      string,
      "asc" | "desc"
    >;
  } else if (sortKey === "commentCount") {
    orderBy = { comment_count: "desc" } satisfies Record<
      string,
      "asc" | "desc"
    >;
  } else {
    orderBy = { tag: { name: "asc" } };
  }
  const records =
    await MyGlobal.prisma.discussion_board_mv_tag_usage_stats.findMany({
      where,
      skip,
      take,
      orderBy,
      select: {
        id: true,
        article_count: true,
        comment_count: true,
        refreshed_at: true,
        tag: {
          select: {
            id: true,
            name: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
      },
    });
  const total = await MyGlobal.prisma.discussion_board_mv_tag_usage_stats.count(
    { where },
  );
  const safeToISOString = toISOStringSafe;
  return {
    data: records.map((record) => ({
      id: record.id,
      articleCount: record.article_count,
      commentCount: record.comment_count,
      refreshedAt: safeToISOString(record.refreshed_at),
      tag: {
        id: record.tag.id,
        name: record.tag.name,
        created_at: safeToISOString(record.tag.created_at),
        updated_at: safeToISOString(record.tag.updated_at),
        deleted_at: record.tag.deleted_at
          ? safeToISOString(record.tag.deleted_at)
          : null,
      },
    })),
    pagination: {
      current: page,
      limit: take,
      records: total,
      pages: Math.ceil(total / take),
    },
  };
}
