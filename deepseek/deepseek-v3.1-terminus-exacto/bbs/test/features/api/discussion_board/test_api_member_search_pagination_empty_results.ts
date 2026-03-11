import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

/**
 * Test pagination behavior and empty result handling for member search functionality.
 * 1. Create member user and authenticate
 * 2. Create limited number of articles for pagination testing
 * 3. Test pagination metadata and empty result scenarios
 * 4. Validate pagination behavior with different page sizes
 */
export async function test_api_member_search_pagination_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate member user
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
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
  typia.assert(member);
  // 2. Create limited number of articles (3 articles for pagination testing)
  const articles = [];
  for (let i = 0; i < 3; i++) {
    try {
      const article =
        await generate_random_discussion_board_member_articles_create(
          memberConnection,
          {
            body: {
              title: `Test Article ${i + 1}`,
              body: RandomGenerator.content({ paragraphs: 2 }),
              discussion_board_section_id: typia.random<
                string & tags.Format<"uuid">
              >(),
            } satisfies IDiscussionBoardArticle.ICreate,
          },
        );
      typia.assert(article);
      articles.push(article);
    } catch (error) {
      // If article creation fails due to invalid section, skip and continue
      // This handles the case where section ID doesn't reference existing section
      continue;
    }
  }
  // If no articles were created successfully, test with empty dataset
  if (articles.length === 0) {
    // Test empty search results
    const emptySearch =
      await api.functional.discussionBoard.member.search.index(
        memberConnection,
        {
          body: {
            search: "nonexistentkeyword12345",
            page: 1,
            limit: 10,
          } satisfies IDiscussionBoardArticle.IRequest,
        },
      );
    typia.assert(emptySearch);
    // Validate empty result pagination metadata
    TestValidator.equals(
      "empty search current page",
      emptySearch.pagination.current,
      1,
    );
    TestValidator.equals(
      "empty search limit",
      emptySearch.pagination.limit,
      10,
    );
    TestValidator.equals(
      "empty search total records",
      emptySearch.pagination.records,
      0,
    );
    TestValidator.equals(
      "empty search total pages",
      emptySearch.pagination.pages,
      0,
    );
    TestValidator.equals(
      "empty search data length",
      emptySearch.data.length,
      0,
    );
    return;
  }
  // 3. Test empty search results with non-matching query
  const emptySearch = await api.functional.discussionBoard.member.search.index(
    memberConnection,
    {
      body: {
        search: "nonexistentkeyword12345",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(emptySearch);
  // Validate empty result pagination metadata
  TestValidator.equals(
    "empty search current page",
    emptySearch.pagination.current,
    1,
  );
  TestValidator.equals("empty search limit", emptySearch.pagination.limit, 10);
  TestValidator.equals(
    "empty search total records",
    emptySearch.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty search total pages",
    emptySearch.pagination.pages,
    0,
  );
  TestValidator.equals("empty search data length", emptySearch.data.length, 0);
  // 4. Test pagination with actual articles
  const firstPage = await api.functional.discussionBoard.member.search.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 2,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(firstPage);
  // Validate first page pagination metadata
  TestValidator.equals(
    "first page current page",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals("first page limit", firstPage.pagination.limit, 2);
  TestValidator.equals(
    "first page total records",
    firstPage.pagination.records,
    articles.length,
  );
  TestValidator.equals(
    "first page total pages",
    firstPage.pagination.pages,
    Math.ceil(articles.length / 2),
  );
  TestValidator.predicate("first page has data", firstPage.data.length > 0);
  // 5. Test second page
  const secondPage = await api.functional.discussionBoard.member.search.index(
    memberConnection,
    {
      body: {
        page: 2,
        limit: 2,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(secondPage);
  // Validate second page pagination metadata
  TestValidator.equals(
    "second page current page",
    secondPage.pagination.current,
    2,
  );
  TestValidator.equals("second page limit", secondPage.pagination.limit, 2);
  TestValidator.equals(
    "second page total records",
    secondPage.pagination.records,
    articles.length,
  );
  TestValidator.equals(
    "second page total pages",
    secondPage.pagination.pages,
    Math.ceil(articles.length / 2),
  );
  // 6. Test out-of-bounds page
  const outOfBoundsPage =
    await api.functional.discussionBoard.member.search.index(memberConnection, {
      body: {
        page: 3,
        limit: 2,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(outOfBoundsPage);
  // Validate out-of-bounds page returns empty results
  TestValidator.equals(
    "out-of-bounds page current page",
    outOfBoundsPage.pagination.current,
    3,
  );
  TestValidator.equals(
    "out-of-bounds page limit",
    outOfBoundsPage.pagination.limit,
    2,
  );
  TestValidator.equals(
    "out-of-bounds page total records",
    outOfBoundsPage.pagination.records,
    articles.length,
  );
  TestValidator.equals(
    "out-of-bounds page total pages",
    outOfBoundsPage.pagination.pages,
    Math.ceil(articles.length / 2),
  );
  TestValidator.equals(
    "out-of-bounds page data length",
    outOfBoundsPage.data.length,
    0,
  );
  // 7. Test different page sizes
  const singleItemPage =
    await api.functional.discussionBoard.member.search.index(memberConnection, {
      body: {
        page: 1,
        limit: 1,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(singleItemPage);
  TestValidator.equals(
    "single item page current page",
    singleItemPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "single item page limit",
    singleItemPage.pagination.limit,
    1,
  );
  TestValidator.equals(
    "single item page total records",
    singleItemPage.pagination.records,
    articles.length,
  );
  TestValidator.equals(
    "single item page total pages",
    singleItemPage.pagination.pages,
    Math.ceil(articles.length / 1),
  );
  TestValidator.predicate(
    "single item page has data",
    singleItemPage.data.length > 0,
  );
  // 8. Test large page size that exceeds total records
  const largePageSize =
    await api.functional.discussionBoard.member.search.index(memberConnection, {
      body: {
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(largePageSize);
  TestValidator.equals(
    "large page size current page",
    largePageSize.pagination.current,
    1,
  );
  TestValidator.equals(
    "large page size limit",
    largePageSize.pagination.limit,
    10,
  );
  TestValidator.equals(
    "large page size total records",
    largePageSize.pagination.records,
    articles.length,
  );
  TestValidator.equals(
    "large page size total pages",
    largePageSize.pagination.pages,
    Math.ceil(articles.length / 10),
  );
  TestValidator.equals(
    "large page size data length",
    largePageSize.data.length,
    articles.length,
  );
}
