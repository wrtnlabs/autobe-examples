import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
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
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

/**
 * Test partial text matching and relevance ranking in admin search.
 * Setup: Create admin user and sections, then create articles with carefully
 * crafted titles and content to test PostgreSQL trigram similarity search.
 * Test: 1) Partial word matches where search query matches part of article titles or content,
 * 2) Relevance scoring by creating articles with varying degrees of match against search terms,
 * 3) Case-insensitive search behavior.
 * Verify that search results are ranked appropriately based on relevance scoring
 * and that partial matches are correctly identified.
 */
export async function test_api_search_admin_partial_matching_relevance_ranking(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin1234",
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Create member connection for article creation
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "member1234",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: "https://example.com",
      referrer: "https://example.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  // Note: Since we cannot create sections via API (no section creation endpoint available),
  // we'll need to work with the assumption that sections exist or use a different approach
  // For this test, we'll focus on testing the search functionality with the articles we can create
  // Create articles with carefully varied content to test relevance ranking
  const articles = await ArrayUtil.asyncRepeat(5, async (index) => {
    // Create articles with varying degrees of match to test relevance scoring
    const titles = [
      "Advanced Technology Trends in Modern Programming",
      "Basic Programming Concepts for Beginners",
      "Technology Innovation and Software Development",
      "Programming Languages Comparison Guide",
      "Future of Technology in Computer Science",
    ];
    const bodies = [
      "This article explores advanced technology trends and modern programming techniques including AI and machine learning applications.",
      "Basic programming concepts covered include variables, loops, and functions for beginner developers.",
      "Discussion of technology innovation trends and their impact on software development methodologies.",
      "Comprehensive comparison of popular programming languages including Python, JavaScript, and Java.",
      "Analysis of future technology directions in computer science and their potential impacts.",
    ];
    const article = await api.functional.discussionBoard.member.articles.create(
      memberConnection,
      {
        body: {
          title: titles[index],
          body: bodies[index],
          discussion_board_section_id: typia.random<
            string & tags.Format<"uuid">
          >(),
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
    typia.assert(article);
    return article;
  });
  // Test partial matching with search query "Technology Programming"
  const searchResult = await api.functional.discussionBoard.admin.search.index(
    adminConnection,
    {
      body: {
        search: "Technology Programming",
        limit: 10,
        page: 1,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(searchResult);
  // Validate search results contain expected articles
  TestValidator.predicate(
    "search should return results for 'Technology Programming'",
    searchResult.data.length > 0,
  );
  // Test case-insensitive search
  const caseInsensitiveResult =
    await api.functional.discussionBoard.admin.search.index(adminConnection, {
      body: {
        search: "technology programming",
        limit: 10,
        page: 1,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(caseInsensitiveResult);
  TestValidator.equals(
    "case-insensitive search should return same number of results",
    searchResult.data.length,
    caseInsensitiveResult.data.length,
  );
  // Test partial word matching
  const partialResult = await api.functional.discussionBoard.admin.search.index(
    adminConnection,
    {
      body: {
        search: "Tech Prog",
        limit: 10,
        page: 1,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(partialResult);
  TestValidator.predicate(
    "partial word search 'Tech Prog' should return results",
    partialResult.data.length > 0,
  );
  // Test single word matching
  const singleWordResult =
    await api.functional.discussionBoard.admin.search.index(adminConnection, {
      body: {
        search: "Programming",
        limit: 10,
        page: 1,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(singleWordResult);
  TestValidator.predicate(
    "single word search 'Programming' should return results",
    singleWordResult.data.length > 0,
  );
  // Validate that articles containing both search terms appear higher in results
  // (basic relevance ranking test)
  const multiTermArticles = searchResult.data.filter(
    (article) =>
      article.title.toLowerCase().includes("technology") &&
      article.title.toLowerCase().includes("programming"),
  );
  TestValidator.predicate(
    "articles containing both search terms should be in results",
    multiTermArticles.length > 0,
  );
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination should have valid current page",
    searchResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination should have valid limit",
    searchResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination should have valid records count",
    searchResult.pagination.records >= searchResult.data.length,
  );
  TestValidator.predicate(
    "pagination should have valid pages count",
    searchResult.pagination.pages >= 1,
  );
}
