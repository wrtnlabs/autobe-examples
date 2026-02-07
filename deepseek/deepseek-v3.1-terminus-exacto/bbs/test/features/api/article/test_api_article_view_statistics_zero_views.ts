import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleViewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleViewStat";
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
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

export async function test_api_article_view_statistics_zero_views(
  connection: api.IConnection,
): Promise<void> {
  // Create user-specific connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user);
  // Create a new article with valid content
  const article = await api.functional.discussionBoard.user.articles.create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 3 }),
        section_id: typia.random<string & tags.Format<"uuid">>(),
        status: "published" as const,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Immediately retrieve view statistics for the newly created article
  const viewStats = await api.functional.discussionBoard.articles.view_stats.at(
    userConnection,
    {
      articleId: article.id,
    },
  );
  typia.assert(viewStats);
  // Validate that view statistics show zero views for a brand new article
  TestValidator.equals(
    "total view count should be zero",
    viewStats.total_view_count,
    0,
  );
  TestValidator.equals(
    "unique viewer count should be zero",
    viewStats.unique_viewer_count,
    0,
  );
  TestValidator.equals(
    "total time spent should be zero",
    viewStats.total_time_spent_seconds,
    0,
  );
  // Validate that average time spent is null for an article with no views
  TestValidator.equals(
    "average time spent should be null",
    viewStats.average_time_spent_seconds,
    null,
  );
  // Validate that last viewed at is null for an article with no views
  TestValidator.equals(
    "last viewed at should be null",
    viewStats.last_viewed_at,
    null,
  );
  // Validate timestamps are properly set
  TestValidator.predicate(
    "created at should be valid timestamp",
    viewStats.created_at !== null && viewStats.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated at should be valid timestamp",
    viewStats.updated_at !== null && viewStats.updated_at.length > 0,
  );
}
