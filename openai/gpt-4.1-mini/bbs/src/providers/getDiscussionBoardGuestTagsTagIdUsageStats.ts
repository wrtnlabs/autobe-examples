import { IDiscussionBoardMvTagUsageStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMvTagUsageStat";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardGuestTagsTagIdUsageStats(props: {
  guest: GuestPayload;
  tagId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardMvTagUsageStat> {
  const tag = await MyGlobal.prisma.discussion_board_tags.findUnique({
    where: { id: props.tagId },
    select: { id: true },
  });
  if (!tag) throw new HttpException("Tag not found", 404);
  const usageStats =
    await MyGlobal.prisma.discussion_board_mv_tag_usage_stats.findFirst({
      where: { discussion_board_tag_id: props.tagId },
      select: {
        article_count: true,
        comment_count: true,
        refreshed_at: true,
      },
    });
  if (!usageStats)
    throw new HttpException("Tag usage statistics not found", 404);
  return {
    article_count: usageStats.article_count,
    comment_count: usageStats.comment_count,
    refreshed_at: toISOStringSafe(usageStats.refreshed_at),
  };
}
