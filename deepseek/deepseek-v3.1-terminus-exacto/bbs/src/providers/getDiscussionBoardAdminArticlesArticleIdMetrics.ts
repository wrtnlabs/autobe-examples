import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function getDiscussionBoardAdminArticlesArticleIdMetrics(props: {
  admin: AdminPayload;
  articleId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardArticle.IMetric> {
  // Verify article exists
  const article =
    await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
      where: { id: props.articleId },
      select: { id: true },
    });
  // Get all metrics in parallel
  const [viewStats, commentStats, reactions, favoriteCount] = await Promise.all(
    [
      // View statistics
      MyGlobal.prisma.discussion_board_article_view_stats.findMany({
        where: {
          discussion_board_article_id: props.articleId,
          deleted_at: null,
        },
        select: {
          discussion_board_member_id: true,
          discussion_board_admin_id: true,
          discussion_board_super_admin_id: true,
          discussion_board_guest_id: true,
          ip_address_hash: true,
        } satisfies Prisma.discussion_board_article_view_statsFindManyArgs,
      }),
      // Comment statistics
      MyGlobal.prisma.discussion_board_mv_article_comments.findUnique({
        where: { discussion_board_article_id: props.articleId },
      }),
      // Reactions grouped by type
      MyGlobal.prisma.discussion_board_article_reactions.groupBy({
        by: ["reaction_type"],
        where: { discussion_board_article_id: props.articleId },
        _count: { reaction_type: true },
      }),
      // Favorite count
      MyGlobal.prisma.discussion_board_article_favorites.count({
        where: {
          discussion_board_article_id: props.articleId,
          deleted_at: null,
        },
      }),
    ],
  );
  // Calculate unique views using more efficient approach
  const uniqueViewers = new Set<string>();
  for (const stat of viewStats) {
    if (stat.discussion_board_member_id)
      uniqueViewers.add(`member:${stat.discussion_board_member_id}`);
    if (stat.discussion_board_admin_id)
      uniqueViewers.add(`admin:${stat.discussion_board_admin_id}`);
    if (stat.discussion_board_super_admin_id)
      uniqueViewers.add(`superadmin:${stat.discussion_board_super_admin_id}`);
    if (stat.discussion_board_guest_id)
      uniqueViewers.add(`guest:${stat.discussion_board_guest_id}`);
    if (stat.ip_address_hash) uniqueViewers.add(`ip:${stat.ip_address_hash}`);
  }
  // Build reaction breakdown with type safety
  const reactionMap: IDiscussionBoardArticle.IMetric["reactions"] = {
    like: 0,
    helpful: 0,
    insightful: 0,
    disagree: 0,
  };
  for (const reaction of reactions) {
    const type = reaction.reaction_type.toLowerCase();
    if (
      type === "like" ||
      type === "helpful" ||
      type === "insightful" ||
      type === "disagree"
    ) {
      reactionMap[type] = reaction._count.reaction_type;
    }
  }
  return {
    id: props.articleId,
    total_views: viewStats.length,
    unique_views: uniqueViewers.size,
    comment_count: commentStats?.total_comment_count ?? 0,
    latest_comment_at: commentStats?.latest_comment_timestamp
      ? toISOStringSafe(commentStats.latest_comment_timestamp)
      : null,
    reactions: reactionMap,
    favorite_count: favoriteCount,
  };
}
