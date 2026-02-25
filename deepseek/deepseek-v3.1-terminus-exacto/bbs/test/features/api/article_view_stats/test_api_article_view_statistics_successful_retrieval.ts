import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_discussion_board_admin_articles_create } from "../../../generate/generate_random_discussion_board_admin_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

export async function test_api_article_view_statistics_successful_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin account and get authenticated connection
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // adminConnection headers are updated by authorize_admin_join
  // Step 2: Create an article using admin connection
  const article = await api.functional.discussionBoard.admin.articles.create(
    adminConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 3 }),
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Step 3: Retrieve view statistics for the article
  const stats =
    await api.functional.discussionBoard.admin.articles.view_stats.at(
      adminConnection,
      {
        articleId: article.id,
      },
    );
  typia.assert(stats);
  // Step 4: Validate business logic of view statistics
  // Unique viewers cannot exceed total views
  TestValidator.predicate(
    "unique_viewer_count should not exceed total_view_count",
    stats.unique_viewer_count <= stats.total_view_count,
  );
  // Total time spent should be reasonable (non-negative)
  TestValidator.predicate(
    "total_time_spent_seconds should be non-negative",
    stats.total_time_spent_seconds >= 0,
  );
  // If there are views, average time should be reasonable
  if (stats.total_view_count > 0 && stats.average_time_spent_seconds !== null) {
    TestValidator.predicate(
      "average_time_spent_seconds should be non-negative when present",
      stats.average_time_spent_seconds >= 0,
    );
    // Average should be total divided by views (allow floating point precision)
    const expectedAverage =
      stats.total_time_spent_seconds / stats.total_view_count;
    TestValidator.predicate(
      "average_time_spent_seconds should approximate total/views",
      Math.abs(stats.average_time_spent_seconds - expectedAverage) < 0.001,
    );
  }
  // Last viewed at should be after article creation if views exist
  if (
    stats.last_viewed_at !== null &&
    stats.last_viewed_at !== undefined &&
    stats.total_view_count > 0
  ) {
    const lastViewed = new Date(stats.last_viewed_at);
    const articleCreated = new Date(article.created_at);
    TestValidator.predicate(
      "last_viewed_at should be after article creation when views exist",
      lastViewed >= articleCreated,
    );
  }
  // Validate that timestamps are valid dates
  TestValidator.predicate(
    "created_at should be valid date",
    !isNaN(new Date(stats.created_at).getTime()),
  );
  TestValidator.predicate(
    "updated_at should be valid date",
    !isNaN(new Date(stats.updated_at).getTime()),
  );
}
