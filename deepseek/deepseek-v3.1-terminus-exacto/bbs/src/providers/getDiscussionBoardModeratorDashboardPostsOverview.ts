import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPageIDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardPost";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function getDiscussionBoardModeratorDashboardPostsOverview(props: {
  moderator: ModeratorPayload;
}): Promise<IPageIDiscussionBoardPost.ISummary> {
  // Get total post counts by status
  const [totalPosts, activePosts, pendingPosts, archivedPosts] =
    await Promise.all([
      MyGlobal.prisma.discussion_board_posts.count({
        where: { deleted_at: null },
      }),
      MyGlobal.prisma.discussion_board_posts.count({
        where: {
          deleted_at: null,
          status: "active",
        },
      }),
      MyGlobal.prisma.discussion_board_posts.count({
        where: {
          deleted_at: null,
          status: "pending",
        },
      }),
      MyGlobal.prisma.discussion_board_posts.count({
        where: {
          deleted_at: null,
          status: "archived",
        },
      }),
    ]);

  // Get recent posts for the dashboard (last 10 posts)
  const recentPosts = await MyGlobal.prisma.discussion_board_posts.findMany({
    where: { deleted_at: null },
    orderBy: { created_at: "desc" },
    take: 10,
    select: {
      id: true,
      title: true,
      status: true,
      created_at: true,
    },
  });

  // Transform recent posts to match ISummary interface
  const postSummaries: IDiscussionBoardPost.ISummary[] = recentPosts.map(
    (post) => ({
      id: post.id as string & tags.Format<"uuid">,
      type: "post",
      title: post.title,
    }),
  );

  return {
    pagination: {
      current: 1,
      limit: 10,
      records: totalPosts,
      pages: Math.ceil(totalPosts / 10),
    },
    data: postSummaries,
  };
}
