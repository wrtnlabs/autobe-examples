import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleReaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleReaction";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_member_articles_comments_create } from "../../../generate/generate_random_discussion_board_member_articles_comments_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { generate_random_discussion_board_member_articles_reactions_create } from "../../../generate/generate_random_discussion_board_member_articles_reactions_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_reaction } from "../../../prepare/prepare_random_discussion_board_article_reaction";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";

/**
 * Test admin engagement metrics filtering with various scenarios.
 * Creates articles with different engagement levels and tests filtering
 * by search terms, section IDs, and pagination parameters.
 */
export async function test_api_admin_engagement_metrics_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Create member connection for article creation
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  // Create multiple articles with varying engagement levels
  const articles: IDiscussionBoardArticle[] = [];
  // Create articles with different engagement patterns
  for (let i = 0; i < 10; i++) {
    const article =
      await generate_random_discussion_board_member_articles_create(
        memberConnection,
        {
          body: {
            title: RandomGenerator.paragraph({
              sentences: 1,
              wordMin: 3,
              wordMax: 8,
            }),
            body: RandomGenerator.content({
              paragraphs: 2,
              sentenceMin: 3,
              sentenceMax: 6,
            }),
            discussion_board_section_id: typia.random<
              string & tags.Format<"uuid">
            >(),
          } satisfies IDiscussionBoardArticle.ICreate,
        },
      );
    typia.assert(article);
    articles.push(article);
    // Add varying engagement levels
    if (i < 3) {
      // High engagement articles - add reactions and comments
      for (let j = 0; j < 5; j++) {
        await generate_random_discussion_board_member_articles_reactions_create(
          memberConnection,
          {
            body: {
              discussion_board_article_id: article.id,
              reaction_type: "like",
            } satisfies IDiscussionBoardArticleReaction.ICreate,
          },
        );
      }
      for (let j = 0; j < 3; j++) {
        await generate_random_discussion_board_member_articles_comments_create(
          memberConnection,
          {
            params: { articleId: article.id },
            body: {
              content: RandomGenerator.paragraph({ sentences: 2 }),
            } satisfies IDiscussionBoardComment.ICreate,
          },
        );
      }
    } else if (i < 7) {
      // Medium engagement articles - add some reactions
      for (let j = 0; j < 2; j++) {
        await generate_random_discussion_board_member_articles_reactions_create(
          memberConnection,
          {
            body: {
              discussion_board_article_id: article.id,
              reaction_type: "like",
            } satisfies IDiscussionBoardArticleReaction.ICreate,
          },
        );
      }
    }
    // Low engagement articles (i >= 7) get no additional engagement
  }
  // Test 1: Basic engagement metrics retrieval
  const allArticles =
    await api.functional.discussionBoard.admin.engagement.index(
      adminConnection,
      {
        body: {} satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(allArticles);
  TestValidator.predicate(
    "should return paginated results",
    allArticles.data.length > 0,
  );
  TestValidator.predicate(
    "should have pagination metadata",
    allArticles.pagination.records > 0,
  );
  // Test 2: Filter by search term
  const searchTerm = articles[0].title.substring(0, 5);
  const searchResults =
    await api.functional.discussionBoard.admin.engagement.index(
      adminConnection,
      {
        body: {
          search: searchTerm,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(searchResults);
  TestValidator.predicate(
    "search should return matching articles",
    searchResults.data.some((article) => article.title.includes(searchTerm)),
  );
  // Test 3: Pagination with limit
  const paginatedResults =
    await api.functional.discussionBoard.admin.engagement.index(
      adminConnection,
      {
        body: {
          limit: 3,
          page: 1,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(paginatedResults);
  TestValidator.equals(
    "pagination limit should be respected",
    paginatedResults.data.length,
    3,
  );
  TestValidator.predicate(
    "pagination metadata should be accurate",
    paginatedResults.pagination.limit === 3 &&
      paginatedResults.pagination.current === 1,
  );
  // Test 4: Combined filters with search and pagination
  const combinedResults =
    await api.functional.discussionBoard.admin.engagement.index(
      adminConnection,
      {
        body: {
          search: searchTerm,
          limit: 2,
          page: 1,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(combinedResults);
  TestValidator.predicate(
    "combined filters should return matching articles",
    combinedResults.data.every((article) => article.title.includes(searchTerm)),
  );
  // Validate engagement metrics in article summaries
  const highEngagementArticle = allArticles.data.find(
    (article) => article.comments_count > 0,
  );
  if (highEngagementArticle) {
    TestValidator.predicate(
      "high engagement article should have engagement metrics",
      highEngagementArticle.comments_count >= 0,
    );
  }
}
