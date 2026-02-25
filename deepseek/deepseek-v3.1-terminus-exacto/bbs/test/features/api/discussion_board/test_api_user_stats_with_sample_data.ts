import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleViewStatEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleViewStatEvent";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardPerformanceMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPerformanceMetric";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemConfiguration";
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
import { generate_random_discussion_board_user_articles_comments_create } from "../../../generate/generate_random_discussion_board_user_articles_comments_create";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_view_stat_event } from "../../../prepare/prepare_random_discussion_board_article_view_stat_event";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";

export async function test_api_user_stats_with_sample_data(
  connection: api.IConnection,
): Promise<void> {
  // Create multiple users to simulate platform activity
  const users: IDiscussionBoardUser.IAuthorized[] = [];
  for (let i = 0; i < 3; i++) {
    const userConnection: api.IConnection = { host: connection.host };
    const user = await authorize_user_join(userConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardUser.IJoin,
    });
    typia.assert(user);
    users.push(user);
  }
  // Create articles from different users
  const articles: IDiscussionBoardArticle[] = [];
  for (const user of users) {
    const userConnection: api.IConnection = {
      host: connection.host,
      headers: { Authorization: `Bearer ${user.token.access}` },
    };
    // Each user creates 2-4 articles
    const articleCount = typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<2> & tags.Maximum<4>
    >();
    for (let i = 0; i < articleCount; i++) {
      const article =
        await generate_random_discussion_board_user_articles_create(
          userConnection,
          {
            body: {
              title: RandomGenerator.paragraph({ sentences: 2 }),
              content: RandomGenerator.content({
                paragraphs: 3,
                sentenceMin: 3,
                sentenceMax: 8,
              }),
              discussion_board_section_id: typia.random<
                string & tags.Format<"uuid">
              >(),
            },
          },
        );
      typia.assert(article);
      articles.push(article);
    }
  }
  // Create comments on articles from different users
  const comments: IDiscussionBoardComment[] = [];
  for (const article of articles) {
    // Each article gets 1-3 comments from random users
    const commentCount = typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
    >();
    for (let i = 0; i < commentCount; i++) {
      const randomUser = RandomGenerator.pick(users);
      const userConnection: api.IConnection = {
        host: connection.host,
        headers: { Authorization: `Bearer ${randomUser.token.access}` },
      };
      const comment =
        await generate_random_discussion_board_user_articles_comments_create(
          userConnection,
          {
            params: { articleId: article.id },
            body: {
              content: RandomGenerator.paragraph({ sentences: 1 }),
            },
          },
        );
      typia.assert(comment);
      comments.push(comment);
    }
  }
  // Simulate view events on articles - use anonymous connection for view events
  const anonymousConnection: api.IConnection = { host: connection.host };
  for (const article of articles) {
    // Each article gets 2-5 view events
    const viewCount = typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<2> & tags.Maximum<5>
    >();
    for (let i = 0; i < viewCount; i++) {
      await generate_random_discussion_board_articles_view_stat_events_create(
        anonymousConnection,
        {
          params: { articleId: article.id },
          body: {
            view_duration_seconds: typia.random<
              number &
                tags.Type<"uint32"> &
                tags.Minimum<30> &
                tags.Maximum<300>
            >(),
          },
        },
      );
    }
  }
  // Test the platform statistics endpoint
  const statsConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${users[0].token.access}` },
  };
  const platformStats =
    await api.functional.discussionBoard.user.stats.platform(statsConnection);
  typia.assert(platformStats);
  // Validate that statistics reflect the sample data
  TestValidator.predicate(
    "platform stats should contain valid metrics",
    platformStats.metric_value > 0 && platformStats.metric_type.length > 0,
  );
  TestValidator.predicate(
    "platform stats should have valid timestamp",
    new Date(platformStats.collection_timestamp).getTime() > 0,
  );
}
