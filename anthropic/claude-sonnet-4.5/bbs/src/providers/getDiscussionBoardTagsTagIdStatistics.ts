import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardTagStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTagStatistics";

export async function getDiscussionBoardTagsTagIdStatistics(props: {
  tagId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardTagStatistics> {
  const { tagId } = props;

  const statistics =
    await MyGlobal.prisma.mv_discussion_board_tag_statistics.findFirst({
      where: {
        discussion_board_tag_id: tagId,
      },
    });

  if (!statistics) {
    throw new HttpException("Tag statistics not found", 404);
  }

  return {
    id: statistics.id,
    discussion_board_tag_id: statistics.discussion_board_tag_id,
    usage_count: statistics.usage_count,
    recent_usage_count: statistics.recent_usage_count,
    total_votes: statistics.total_votes,
    follower_count: statistics.follower_count,
    updated_at: toISOStringSafe(statistics.updated_at),
  };
}
