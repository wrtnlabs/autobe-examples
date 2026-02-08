import { IDiscussionBoardMvTagUsageStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMvTagUsageStat";
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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardTagUsageStats(props: {
  body: IDiscussionBoardMvTagUsageStat.IRequest;
}): Promise<IPageIDiscussionBoardMvTagUsageStat.ISummary> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const data =
    await MyGlobal.prisma.discussion_board_mv_tag_usage_stats.findMany({
      skip,
      take: limit,
      orderBy: { refreshed_at: "desc" },
    });
  const total =
    await MyGlobal.prisma.discussion_board_mv_tag_usage_stats.count();
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data.map((record) => ({
      id: record.id,
      discussion_board_tag_id: record.discussion_board_tag_id,
      article_count: record.article_count,
      comment_count: record.comment_count,
      refreshed_at: toISOStringSafe(record.refreshed_at),
    })),
  };
}
