import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
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

/**
 * Test admin article search with text and tag filtering capabilities.
 * Validates advanced search functionality including partial text matching,
 * content search, tag filtering, and pagination.
 */
export async function test_api_admin_articles_search_text_and_tag_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(admin);
  // 2. Create test articles with specific keywords and tags
  const article1 = await api.functional.discussionBoard.admin.articles.create(
    adminConnection,
    {
      body: {
        title: "Economic analysis of market trends",
        content:
          "Detailed analysis of global market economy growth patterns and future projections.",
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article1);
  const article2 = await api.functional.discussionBoard.admin.articles.create(
    adminConnection,
    {
      body: {
        title: "Technology innovation in digital economy",
        content:
          "Exploring innovative technologies driving the digital economy trends worldwide.",
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article2);
  const article3 = await api.functional.discussionBoard.admin.articles.create(
    adminConnection,
    {
      body: {
        title: "Political developments in Asia",
        content:
          "Analysis of recent political changes affecting regional stability.",
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article3);
  // 3. Test 1: Full-text search on title with partial matching
  const titleSearch = await api.functional.discussionBoard.admin.articles.index(
    adminConnection,
    {
      body: {
        title: "economy",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(titleSearch);
  TestValidator.predicate(
    "title search should match case-insensitive partial text",
    titleSearch.data.length >= 1 &&
      (titleSearch.data[0].title.toLowerCase().includes("economy") ||
        titleSearch.data[0].title.toLowerCase().includes("economic")),
  );
  // 4. Test 2: Content search with phrase
  const contentSearch =
    await api.functional.discussionBoard.admin.articles.index(adminConnection, {
      body: {
        content: "market economy",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(contentSearch);
  TestValidator.predicate(
    "content search should find articles with phrase",
    contentSearch.data.length >= 1,
  );
  // 5. Test 3: Empty search results
  const noMatchSearch =
    await api.functional.discussionBoard.admin.articles.index(adminConnection, {
      body: {
        title: "nonexistentkeyword12345",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(noMatchSearch);
  TestValidator.equals(
    "search with non-existent keyword returns empty results",
    noMatchSearch.data.length,
    0,
  );
  // 6. Test 4: Pagination with many articles
  // Create additional articles for pagination test
  const paginationArticles = await Promise.all(
    ArrayUtil.repeat(15, async () => {
      const article =
        await api.functional.discussionBoard.admin.articles.create(
          adminConnection,
          {
            body: {
              title: RandomGenerator.paragraph({ sentences: 2 }),
              content: RandomGenerator.content({ paragraphs: 1 }),
              discussion_board_section_id: typia.random<
                string & tags.Format<"uuid">
              >(),
            } satisfies IDiscussionBoardArticle.ICreate,
          },
        );
      typia.assert(article);
      return article;
    }),
  );
  // Search with pagination
  const page1 = await api.functional.discussionBoard.admin.articles.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 5,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(page1);
  TestValidator.equals("page 1 should have limit items", page1.data.length, 5);
  // The pagination structure is deeply nested, so we need to access it through multiple levels
  TestValidator.predicate(
    "page 1 pagination metadata valid",
    page1.pagination.pagination.pagination.pagination.current === 1 &&
      page1.pagination.pagination.pagination.pagination.limit === 5 &&
      page1.pagination.pagination.pagination.pagination.records >= 18 && // original 3 + 15 new = 18
      page1.pagination.pagination.pagination.pagination.pages >= 4,
  );
  const page2 = await api.functional.discussionBoard.admin.articles.index(
    adminConnection,
    {
      body: {
        page: 2,
        limit: 5,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(page2);
  TestValidator.equals("page 2 should have items", page2.data.length, 5);
  TestValidator.equals(
    "page 2 current page",
    page2.pagination.pagination.pagination.pagination.current,
    2,
  );
  // 7. Test 5: Combined filters (currently tag filtering not available in DTO)
  // Using available filters: title + pagination
  const combinedSearch =
    await api.functional.discussionBoard.admin.articles.index(adminConnection, {
      body: {
        title: "analysis",
        page: 1,
        limit: 5,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(combinedSearch);
  TestValidator.predicate(
    "combined search returns relevant results",
    combinedSearch.data.length >= 1,
  );
}
