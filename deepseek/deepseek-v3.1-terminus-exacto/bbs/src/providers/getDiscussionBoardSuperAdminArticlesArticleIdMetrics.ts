import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardSuperAdminArticlesArticleIdMetrics(props: {
  superAdmin: SuperadminPayload;
  articleId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardArticle.IMetric> {
  // Verify article exists
  const article =
    await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
      where: { id: props.articleId },
    });
  // Count total views
  const totalViewsResult =
    await MyGlobal.prisma.discussion_board_article_view_stats.aggregate({
      where: { discussion_board_article_id: props.articleId },
      _count: { discussion_board_article_id: true },
    });
  const total_views = totalViewsResult._count.discussion_board_article_id;
  // Count unique views (distinct by member + admin + super admin + guest ids and session ids)
  const uniqueViewsResult =
    await MyGlobal.prisma.discussion_board_article_view_stats.findMany({
      where: { discussion_board_article_id: props.articleId },
      select: {
        discussion_board_member_id: true,
        discussion_board_admin_id: true,
        discussion_board_super_admin_id: true,
        discussion_board_guest_id: true,
        discussion_board_member_session_id: true,
        discussion_board_admin_session_id: true,
        discussion_board_super_admin_session_id: true,
        discussion_board_guest_session_id: true,
      },
      distinct: [
        "discussion_board_member_id",
        "discussion_board_admin_id",
        "discussion_board_super_admin_id",
        "discussion_board_guest_id",
        "discussion_board_member_session_id",
        "discussion_board_admin_session_id",
        "discussion_board_super_admin_session_id",
        "discussion_board_guest_session_id",
      ],
    });
  const unique_views = uniqueViewsResult.length;
  // Get comment statistics
  const commentStat =
    await MyGlobal.prisma.discussion_board_mv_article_comments.findUnique({
      where: { discussion_board_article_id: props.articleId },
    });
  const comment_count = commentStat?.total_comment_count ?? 0;
  const latest_comment_at =
    commentStat?.latest_comment_timestamp?.toISOString() ?? null;
  // Aggregate reactions by type
  const reactionCounts =
    await MyGlobal.prisma.discussion_board_article_reactions.groupBy({
      by: ["reaction_type"],
      where: { discussion_board_article_id: props.articleId },
      _count: { reaction_type: true },
    });
  // Initialize reaction counts
  const reactions = {
    like: 0,
    helpful: 0,
    insightful: 0,
    disagree: 0,
  };
  // Map reaction counts to the reaction types
  reactionCounts.forEach((reaction) => {
    const count = reaction._count.reaction_type;
    switch (reaction.reaction_type) {
      case "like":
        reactions.like = count;
        break;
      case "helpful":
        reactions.helpful = count;
        break;
      case "insightful":
        reactions.insightful = count;
        break;
      case "disagree":
        reactions.disagree = count;
        break;
      default:
        // Unknown reaction type - ignore
        break;
    }
  });
  // Count favorites
  const favoriteResult =
    await MyGlobal.prisma.discussion_board_article_favorites.aggregate({
      where: { discussion_board_article_id: props.articleId },
      _count: { discussion_board_article_id: true },
    });
  const favorite_count = favoriteResult._count.discussion_board_article_id;
  return {
    id: article.id,
    total_views,
    unique_views,
    comment_count,
    latest_comment_at,
    reactions,
    favorite_count,
  } satisfies IDiscussionBoardArticle.IMetric;
}
