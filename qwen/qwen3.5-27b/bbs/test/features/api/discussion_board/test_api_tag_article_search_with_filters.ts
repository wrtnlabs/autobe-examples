import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
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
import { generate_random_discussion_board_member_articles_tags_create } from "../../../generate/generate_random_discussion_board_member_articles_tags_create";
import { generate_random_discussion_board_member_tags_create } from "../../../generate/generate_random_discussion_board_member_tags_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_tag } from "../../../prepare/prepare_random_discussion_board_article_tag";
import { prepare_random_discussion_board_tag } from "../../../prepare/prepare_random_discussion_board_tag";

export async function test_api_tag_article_search_with_filters(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test that an authenticated member can search and filter articles by a specific tag.
   * This test validates the tag-based article search functionality with various filters
   * including text search, date ranges, section filtering, and sorting options.
   */
  // 1. Setup: Register and authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Create a tag for filtering
  const tag = await generate_random_discussion_board_member_tags_create(
    memberConnection,
    {
      body: {
        name: "technology",
      },
    },
  );
  typia.assert(tag);
  // 3. Create multiple articles with the tag
  const articles: IDiscussionBoardArticle[] = [];
  for (let i = 0; i < 5; i++) {
    const article =
      await generate_random_discussion_board_member_articles_create(
        memberConnection,
        {
          body: {
            title: `Article ${i + 1} about technology`,
            content: RandomGenerator.paragraph({ sentences: 3 }),
            section_id: typia.random<string & tags.Format<"uuid">>(),
            tags: ["technology"],
          },
        },
      );
    typia.assert(article);
    articles.push(article);
  }
  // 4. Test basic tag-based article search
  const searchResult =
    await api.functional.discussionBoard.tags.articles.patchByTagid(
      memberConnection,
      {
        tagId: tag.id,
        body: {
          page: 1,
          limit: 20,
        },
      },
    );
  typia.assert(searchResult);
  // 5. Verify all returned articles exist in our created list
  const createdArticleIds = articles.map((a) => a.id);
  for (const article of searchResult.data) {
    TestValidator.predicate(
      `article ${article.id} exists in created list`,
      createdArticleIds.includes(article.id),
    );
  }
  // 6. Test search parameter filtering
  const searchQuery = "Article 1";
  const searchResultWithQuery =
    await api.functional.discussionBoard.tags.articles.patchByTagid(
      memberConnection,
      {
        tagId: tag.id,
        body: {
          search: searchQuery,
          page: 1,
          limit: 20,
        },
      },
    );
  typia.assert(searchResultWithQuery);
  TestValidator.predicate(
    "search results contain query text in title",
    searchResultWithQuery.data.every((a) => a.title.includes(searchQuery)),
  );
  // 7. Test date range filtering using actual article creation dates
  const earliestDate = articles.reduce(
    (min, a) => (new Date(a.created_at) < new Date(min) ? a.created_at : min),
    articles[0].created_at,
  );
  const latestDate = articles.reduce(
    (max, a) => (new Date(a.created_at) > new Date(max) ? a.created_at : max),
    articles[0].created_at,
  );
  const searchResultWithDateRange =
    await api.functional.discussionBoard.tags.articles.patchByTagid(
      memberConnection,
      {
        tagId: tag.id,
        body: {
          from_date: earliestDate,
          to_date: latestDate,
          page: 1,
          limit: 20,
        },
      },
    );
  typia.assert(searchResultWithDateRange);
  TestValidator.predicate(
    "articles within date range",
    searchResultWithDateRange.data.every((a) => {
      const articleDate = new Date(a.created_at);
      return (
        articleDate >= new Date(earliestDate) &&
        articleDate <= new Date(latestDate)
      );
    }),
  );
  // 8. Test sorting by createdAt descending
  const sortedByCreatedAtDesc =
    await api.functional.discussionBoard.tags.articles.patchByTagid(
      memberConnection,
      {
        tagId: tag.id,
        body: {
          sortBy: "createdAt",
          sortOrder: "desc",
          page: 1,
          limit: 20,
        },
      },
    );
  typia.assert(sortedByCreatedAtDesc);
  TestValidator.predicate(
    "sorted by createdAt descending",
    sortedByCreatedAtDesc.data.every((article, index, array) => {
      if (index === 0) return true;
      return (
        new Date(article.created_at) <= new Date(array[index - 1].created_at)
      );
    }),
  );
  // 9. Test sorting by title ascending
  const sortedByTitleAsc =
    await api.functional.discussionBoard.tags.articles.patchByTagid(
      memberConnection,
      {
        tagId: tag.id,
        body: {
          sortBy: "title",
          sortOrder: "asc",
          page: 1,
          limit: 20,
        },
      },
    );
  typia.assert(sortedByTitleAsc);
  TestValidator.predicate(
    "sorted by title ascending",
    sortedByTitleAsc.data.every((article, index, array) => {
      if (index === 0) return true;
      return article.title.localeCompare(array[index - 1].title) >= 0;
    }),
  );
  // 10. Test pagination with limit
  const paginatedResult =
    await api.functional.discussionBoard.tags.articles.patchByTagid(
      memberConnection,
      {
        tagId: tag.id,
        body: {
          page: 1,
          limit: 2,
        },
      },
    );
  typia.assert(paginatedResult);
  TestValidator.equals("limit respected", paginatedResult.data.length, 2);
  TestValidator.equals("pagination limit", paginatedResult.pagination.limit, 2);
}
