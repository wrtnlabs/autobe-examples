import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardPostStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPostStatistics";
import { IDiscussionBoardPostStatusCounts } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPostStatusCounts";
import { IPostStatusPercentages } from "@ORGANIZATION/PROJECT-api/lib/structures/IPostStatusPercentages";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function getDiscussionBoardModeratorStatisticsPostsByStatus(props: {
  moderator: ModeratorPayload;
}): Promise<IDiscussionBoardPostStatistics> {
  // Get counts for each status category individually to ensure all are represented
  const [draftCount, publishedCount, archivedCount, deletedCount] =
    await Promise.all([
      MyGlobal.prisma.discussion_board_posts.count({
        where: { status: "draft", deleted_at: null },
      }),
      MyGlobal.prisma.discussion_board_posts.count({
        where: { status: "published", deleted_at: null },
      }),
      MyGlobal.prisma.discussion_board_posts.count({
        where: { status: "archived", deleted_at: null },
      }),
      MyGlobal.prisma.discussion_board_posts.count({
        where: { status: "deleted", deleted_at: null },
      }),
    ]);

  const totalPosts = draftCount + publishedCount + archivedCount + deletedCount;

  const status_counts: IDiscussionBoardPostStatusCounts = {
    draft: draftCount,
    published: publishedCount,
    archived: archivedCount,
    deleted: deletedCount,
  };

  const status_percentages: IPostStatusPercentages = {
    draft_percentage: totalPosts > 0 ? (draftCount / totalPosts) * 100 : 0,
    published_percentage:
      totalPosts > 0 ? (publishedCount / totalPosts) * 100 : 0,
    archived_percentage:
      totalPosts > 0 ? (archivedCount / totalPosts) * 100 : 0,
    deleted_percentage: totalPosts > 0 ? (deletedCount / totalPosts) * 100 : 0,
  };

  return {
    status_counts,
    total_posts: totalPosts,
    status_percentages,
  };
}
