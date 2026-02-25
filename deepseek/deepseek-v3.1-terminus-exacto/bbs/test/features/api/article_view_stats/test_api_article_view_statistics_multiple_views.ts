import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleViewStatEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleViewStatEvent";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_articles_view_stat_events_create } from "../../../generate/generate_random_discussion_board_articles_view_stat_events_create";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_view_stat_event } from "../../../prepare/prepare_random_discussion_board_article_view_stat_event";

export async function test_api_article_view_statistics_multiple_views(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and register
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(user);
  // Create article
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 7,
        }),
        content: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 10,
          wordMax: 15,
        }),
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      },
    },
  );
  typia.assert(article);
  // Simulate multiple view events from distinct viewers with varying durations
  const viewSessions = [
    { duration: 30, viewerIndex: 0 },
    { duration: 45, viewerIndex: 1 },
    { duration: 60, viewerIndex: 2 },
    { duration: 15, viewerIndex: 0 },
    { duration: 90, viewerIndex: 1 },
  ];
  let totalDuration = 0;
  for (const session of viewSessions) {
    totalDuration += session.duration;
    await generate_random_discussion_board_articles_view_stat_events_create(
      userConnection,
      {
        params: { articleId: article.id },
        body: {
          view_duration_seconds: session.duration satisfies number | null as
            | number
            | null,
          discussion_board_user_session_id: typia.random<
            string & tags.Format<"uuid">
          >(),
        },
      },
    );
  }
  // Retrieve view statistics
  const stats =
    await api.functional.discussionBoard.user.articles.view_stats.at(
      userConnection,
      {
        articleId: article.id,
      },
    );
  typia.assert(stats);
  // Validate aggregation metrics
  TestValidator.equals(
    "total view count matches expected",
    stats.total_view_count,
    viewSessions.length,
  );
  TestValidator.equals(
    "unique viewer count matches expected",
    stats.unique_viewer_count,
    3,
  );
  TestValidator.predicate(
    "last viewed at is not null",
    stats.last_viewed_at !== null,
  );
  const expectedAverage = Math.round(totalDuration / viewSessions.length);
  TestValidator.equals(
    "average time spent matches expected",
    stats.average_time_spent_seconds,
    expectedAverage,
  );
  TestValidator.equals(
    "total time spent matches expected",
    stats.total_time_spent_seconds,
    totalDuration,
  );
}
