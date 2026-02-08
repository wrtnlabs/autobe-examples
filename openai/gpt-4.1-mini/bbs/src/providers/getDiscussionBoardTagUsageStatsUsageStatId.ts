import { IDiscussionBoardMvTagUsageStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMvTagUsageStat";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardTagUsageStatsUsageStatId(props: {
  usageStatId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardMvTagUsageStat> {
  const record =
    await MyGlobal.prisma.discussion_board_mv_tag_usage_stats.findUnique({
      where: { id: props.usageStatId },
    });
  if (!record) {
    throw new HttpException("Tag usage statistic not found", 404);
  }
  return {
    id: record.id,
    discussion_board_tag_id: record.discussion_board_tag_id,
    article_count: record.article_count,
    comment_count: record.comment_count,
    refreshed_at: toISOStringSafe(record.refreshed_at),
  };
}
