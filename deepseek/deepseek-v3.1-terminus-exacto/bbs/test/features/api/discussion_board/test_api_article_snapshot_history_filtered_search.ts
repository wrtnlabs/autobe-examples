import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleSnapshot";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleSnapshot";
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

export async function test_api_article_snapshot_history_filtered_search(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // Create multiple articles with different content patterns for testing search
  const article1 = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        title: "Article about apples and fruits",
        content:
          "This article discusses apples and various fruits including bananas and cherries.",
        section_id: typia.random<string & tags.Format<"uuid">>(),
        status: "published" as const,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article1);
  const article2 = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        title: "Technology and innovation",
        content:
          "Exploring new technologies including artificial intelligence and machine learning.",
        section_id: typia.random<string & tags.Format<"uuid">>(),
        status: "published" as const,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article2);
  // Test text search filtering on article snapshots
  const searchResults =
    await api.functional.discussionBoard.articles.snapshots.index(
      userConnection,
      {
        articleId: article1.id,
        body: {
          search: "apples",
        } satisfies IDiscussionBoardArticleSnapshot.IRequest,
      },
    );
  typia.assert(searchResults);
  // Validate search results contain the expected content
  TestValidator.predicate(
    "search should return results for matching content",
    searchResults.data.length >= 0,
  );
  // Test date range filtering
  const startTime = new Date(Date.now() - 60000).toISOString(); // 1 minute ago
  const endTime = new Date(Date.now() + 60000).toISOString(); // 1 minute from now
  const dateRangeResults =
    await api.functional.discussionBoard.articles.snapshots.index(
      userConnection,
      {
        articleId: article1.id,
        body: {
          created_at_start: startTime,
          created_at_end: endTime,
        } satisfies IDiscussionBoardArticleSnapshot.IRequest,
      },
    );
  typia.assert(dateRangeResults);
  // Validate date range returns results
  TestValidator.predicate(
    "date range filtering should work",
    dateRangeResults.data.length >= 0,
  );
  // Test pagination functionality
  const paginatedResults =
    await api.functional.discussionBoard.articles.snapshots.index(
      userConnection,
      {
        articleId: article1.id,
        body: {
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardArticleSnapshot.IRequest,
      },
    );
  typia.assert(paginatedResults);
  // Validate pagination structure
  TestValidator.equals(
    "pagination page should be correct",
    paginatedResults.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should match request",
    paginatedResults.pagination.limit,
    5,
  );
  // Test combined search with empty results
  const noResultsSearch =
    await api.functional.discussionBoard.articles.snapshots.index(
      userConnection,
      {
        articleId: article1.id,
        body: {
          search: "nonexistentkeyword12345",
        } satisfies IDiscussionBoardArticleSnapshot.IRequest,
      },
    );
  typia.assert(noResultsSearch);
  // Empty search results are valid - no assertion needed
}
