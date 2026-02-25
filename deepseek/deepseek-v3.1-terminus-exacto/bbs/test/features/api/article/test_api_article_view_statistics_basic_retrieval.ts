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
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

/**
 * Test basic view statistics retrieval for a newly created article with minimal views.
 */
export async function test_api_article_view_statistics_basic_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(authorizedUser);
  // Create an article using the generation utility function
  // Note: This assumes valid section IDs are available in the system
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.paragraph({ sentences: 5 }),
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Retrieve view statistics for the newly created article
  const viewStats =
    await api.functional.discussionBoard.user.articles.view_stats.at(
      userConnection,
      {
        articleId: article.id,
      },
    );
  typia.assert(viewStats);
  // Validate view statistics fields for basic retrieval scenario
  TestValidator.equals(
    "view stats ID should match article ID",
    viewStats.id,
    article.id,
  );
  TestValidator.equals(
    "total view count should be 0 for new article",
    viewStats.total_view_count,
    0,
  );
  TestValidator.equals(
    "unique viewer count should be 0 for new article",
    viewStats.unique_viewer_count,
    0,
  );
  TestValidator.equals(
    "last viewed at should be null for new article",
    viewStats.last_viewed_at,
    null,
  );
  TestValidator.equals(
    "average time spent should be null for new article",
    viewStats.average_time_spent_seconds,
    null,
  );
  TestValidator.equals(
    "total time spent should be 0 for new article",
    viewStats.total_time_spent_seconds,
    0,
  );
  TestValidator.predicate(
    "created at timestamp should be valid",
    new Date(viewStats.created_at).getTime() > 0,
  );
  TestValidator.predicate(
    "updated at timestamp should be valid",
    new Date(viewStats.updated_at).getTime() > 0,
  );
}
