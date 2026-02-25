import { IDiscussionBoardArticleViewStatEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleViewStatEvent";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardArticleViewStatEventCollector } from "../collectors/DiscussionBoardArticleViewStatEventCollector";
import { DiscussionBoardArticleViewStatEventTransformer } from "../transformers/DiscussionBoardArticleViewStatEventTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardArticlesArticleIdViewStatEvents(props: {
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleViewStatEvent.ICreate;
}): Promise<IDiscussionBoardArticleViewStatEvent> {
  // 1. Verify article exists
  const article =
    await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
      where: { id: props.articleId },
      select: { id: true },
    });
  // 2. Validate view duration if provided
  if (
    props.body.view_duration_seconds !== undefined &&
    props.body.view_duration_seconds !== null
  ) {
    if (props.body.view_duration_seconds < 0) {
      throw new HttpException("View duration must be non-negative", 400);
    }
  }
  // 3. Validate user session if provided
  let userSession;
  if (
    props.body.discussion_board_user_session_id !== undefined &&
    props.body.discussion_board_user_session_id !== null
  ) {
    userSession =
      await MyGlobal.prisma.discussion_board_user_sessions.findUniqueOrThrow({
        where: { id: props.body.discussion_board_user_session_id },
        select: { id: true },
      });
  }
  // 4. Prepare entities for collector
  const articleEntity = { id: article.id };
  // Handle user session entity properly to satisfy IEntity interface
  const userSessionEntity = userSession ? { id: userSession.id } : { id: v4() }; // Generate a fallback UUID instead of null
  // 5. Create view stat event using collector
  const created =
    await MyGlobal.prisma.discussion_board_article_view_stat_events.create({
      data: await DiscussionBoardArticleViewStatEventCollector.collect({
        body: props.body,
        discussionBoardArticles: articleEntity,
        discussionBoardUserSessions: userSessionEntity,
      }),
    });
  // 6. Update aggregated view statistics
  // First, check if stats record exists for this article
  const existingStats =
    await MyGlobal.prisma.discussion_board_article_view_stats.findUnique({
      where: { discussion_board_article_id: props.articleId },
    });
  const now = new Date();
  const viewDuration = props.body.view_duration_seconds ?? 0;
  // Fix Date to string conversions for proper Typia tag compatibility
  const isoNow = toISOStringSafe(now);
  if (existingStats) {
    // Update existing stats
    const updated =
      await MyGlobal.prisma.discussion_board_article_view_stats.update({
        where: { id: existingStats.id },
        data: {
          total_view_count: existingStats.total_view_count + 1,
          unique_viewer_count:
            existingStats.unique_viewer_count + (userSession ? 1 : 0),
          last_viewed_at: isoNow,
          average_time_spent_seconds:
            ((existingStats.average_time_spent_seconds ?? 0) *
              existingStats.total_view_count +
              viewDuration) /
            (existingStats.total_view_count + 1),
          total_time_spent_seconds:
            existingStats.total_time_spent_seconds + viewDuration,
          updated_at: isoNow,
        },
        ...DiscussionBoardArticleViewStatEventTransformer.select(),
      });
    return await DiscussionBoardArticleViewStatEventTransformer.transform(
      updated,
    );
  } else {
    // Create new stats record
    const createdStats =
      await MyGlobal.prisma.discussion_board_article_view_stats.create({
        data: {
          id: v4(),
          discussion_board_article_id: props.articleId,
          total_view_count: 1,
          unique_viewer_count: userSession ? 1 : 0,
          last_viewed_at: isoNow,
          average_time_spent_seconds: viewDuration,
          total_time_spent_seconds: viewDuration,
          created_at: isoNow,
          updated_at: isoNow,
        },
        ...DiscussionBoardArticleViewStatEventTransformer.select(),
      });
    return await DiscussionBoardArticleViewStatEventTransformer.transform(
      createdStats,
    );
  }
}
