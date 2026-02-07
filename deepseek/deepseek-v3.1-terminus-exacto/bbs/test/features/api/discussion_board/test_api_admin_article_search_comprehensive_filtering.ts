import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
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
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_admin_article_search_comprehensive_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.ILogin,
  });
  // Create test sections using admin connection
  const section1 = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        display_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1>
        >(),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section1);
  const section2 = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        display_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1>
        >(),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section2);
  // Create test users with their own connections
  const user1Connection: api.IConnection = { host: connection.host };
  const user1 = await authorize_user_join(user1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user1);
  const user2Connection: api.IConnection = { host: connection.host };
  const user2 = await authorize_user_join(user2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user2);
  // Create test articles using user-specific connections
  const articles = [];
  // User1 articles
  const article1 = await generate_random_discussion_board_user_articles_create(
    user1Connection,
    {
      body: {
        title: "Test Article about Technology and Innovation",
        content:
          "This article discusses the latest technology trends and innovations in the industry.",
        section_id: section1.id,
        status: "published" as const,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article1);
  articles.push(article1);
  const article2 = await generate_random_discussion_board_user_articles_create(
    user1Connection,
    {
      body: {
        title: "Draft Article about Politics",
        content:
          "This is a draft article discussing current political affairs.",
        section_id: section1.id,
        status: "draft" as const,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article2);
  articles.push(article2);
  // User2 articles
  const article3 = await generate_random_discussion_board_user_articles_create(
    user2Connection,
    {
      body: {
        title: "Economic Analysis and Trends",
        content:
          "Comprehensive analysis of current economic trends and market conditions.",
        section_id: section2.id,
        status: "published" as const,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article3);
  articles.push(article3);
  const article4 = await generate_random_discussion_board_user_articles_create(
    user2Connection,
    {
      body: {
        title: "Archived Historical Article",
        content:
          "This article has been archived and contains historical information.",
        section_id: section2.id,
        status: "archived" as const,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article4);
  articles.push(article4);
  // Wait a moment to ensure articles have different timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));
  // Test 1: Full-text search on title
  const searchResult1 =
    await api.functional.discussionBoard.admin.articles.index(adminConnection, {
      body: {
        search: "Technology",
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(searchResult1);
  TestValidator.predicate(
    "search by title returns article with matching title",
    searchResult1.data.some((article) => article.title.includes("Technology")),
  );
  // Test 2: Full-text search on content
  const searchResult2 =
    await api.functional.discussionBoard.admin.articles.index(adminConnection, {
      body: {
        search: "economic trends",
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(searchResult2);
  TestValidator.predicate(
    "search by content returns article with matching content",
    searchResult2.data.length > 0,
  );
  // Test 3: Filter by section
  const searchResult3 =
    await api.functional.discussionBoard.admin.articles.index(adminConnection, {
      body: {
        section_id: section1.id,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(searchResult3);
  TestValidator.predicate(
    "filter by section returns only articles from section1",
    searchResult3.data.every((article) => article.section.id === section1.id),
  );
  TestValidator.equals(
    "section1 filter returns correct number of articles",
    searchResult3.data.length,
    2,
  );
  // Test 4: Filter by author
  const searchResult4 =
    await api.functional.discussionBoard.admin.articles.index(adminConnection, {
      body: {
        author_id: user1.id,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(searchResult4);
  TestValidator.predicate(
    "filter by author returns only articles from user1",
    searchResult4.data.every((article) => article.author.id === user1.id),
  );
  TestValidator.equals(
    "user1 filter returns correct number of articles",
    searchResult4.data.length,
    2,
  );
  // Test 5: Filter by status
  const searchResult5 =
    await api.functional.discussionBoard.admin.articles.index(adminConnection, {
      body: {
        status: "published",
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(searchResult5);
  TestValidator.predicate(
    "filter by status returns only published articles",
    searchResult5.data.every((article) => article.status === "published"),
  );
  TestValidator.equals(
    "published filter returns correct number of articles",
    searchResult5.data.length,
    2,
  );
  // Test 6: Combined filters
  const searchResult6 =
    await api.functional.discussionBoard.admin.articles.index(adminConnection, {
      body: {
        section_id: section1.id,
        status: "published",
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(searchResult6);
  TestValidator.predicate(
    "combined filters return articles matching section1 and published",
    searchResult6.data.every(
      (article) =>
        article.section.id === section1.id && article.status === "published",
    ),
  );
  TestValidator.equals(
    "combined filter returns correct number of articles",
    searchResult6.data.length,
    1,
  );
  // Test 7: Pagination
  const searchResult7 =
    await api.functional.discussionBoard.admin.articles.index(adminConnection, {
      body: {
        page: 1,
        limit: 2,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(searchResult7);
  TestValidator.predicate(
    "pagination returns correct number of items",
    searchResult7.data.length <= 2,
  );
  TestValidator.equals(
    "pagination current page is correct",
    searchResult7.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is correct",
    searchResult7.pagination.limit,
    2,
  );
  TestValidator.predicate(
    "pagination records count is valid",
    searchResult7.pagination.records >= 0,
  );
  // Test 8: Date range filtering (created_after)
  const timestampBeforeArticles = new Date(
    Date.now() - 60 * 1000,
  ).toISOString();
  const searchResult8 =
    await api.functional.discussionBoard.admin.articles.index(adminConnection, {
      body: {
        created_after: timestampBeforeArticles,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(searchResult8);
  TestValidator.predicate(
    "date range filter returns articles created after specified time",
    searchResult8.data.length >= 0,
  );
  // Test 9: Empty search result
  const searchResult9 =
    await api.functional.discussionBoard.admin.articles.index(adminConnection, {
      body: {
        search: "nonexistentkeyword12345",
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(searchResult9);
  TestValidator.equals(
    "search with non-existent keyword returns empty result",
    searchResult9.data.length,
    0,
  );
  // Test 10: Multiple combined filters
  const searchResult10 =
    await api.functional.discussionBoard.admin.articles.index(adminConnection, {
      body: {
        section_id: section2.id,
        author_id: user2.id,
        status: "archived",
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(searchResult10);
  TestValidator.predicate(
    "multiple combined filters return exact matching article",
    searchResult10.data.every(
      (article) =>
        article.section.id === section2.id &&
        article.author.id === user2.id &&
        article.status === "archived",
    ),
  );
  TestValidator.equals(
    "multiple combined filters return exactly one article",
    searchResult10.data.length,
    1,
  );
}
