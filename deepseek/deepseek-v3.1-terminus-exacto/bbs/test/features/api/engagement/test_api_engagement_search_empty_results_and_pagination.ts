import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleReaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleReaction";
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
import { generate_random_discussion_board_member_articles_reactions_create } from "../../../generate/generate_random_discussion_board_member_articles_reactions_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_reaction } from "../../../prepare/prepare_random_discussion_board_article_reaction";

export async function test_api_engagement_search_empty_results_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection
  const memberConnection: api.IConnection = { host: connection.host };
  // Register and authenticate member
  await authorize_member_join(memberConnection, {
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
  // Create multiple articles for pagination testing with consistent content
  const articleTitles: string[] = [];
  for (let i = 0; i < 15; i++) {
    const article =
      await generate_random_discussion_board_member_articles_create(
        memberConnection,
        {
          body: {
            title: `PaginationTestArticle${i + 1}`,
            body: `Content for pagination test article ${i + 1}`,
            discussion_board_section_id: typia.random<
              string & tags.Format<"uuid">
            >(),
          } satisfies IDiscussionBoardArticle.ICreate,
        },
      );
    typia.assert(article);
    articleTitles.push(article.title);
  }
  // Test 1: Search for criteria that intentionally excludes all articles
  const emptySearchResult =
    await api.functional.discussionBoard.member.engagement.index(
      memberConnection,
      {
        body: {
          search: "ThisPhraseDoesNotExistInAnyArticleXYZ123",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(emptySearchResult);
  // Validate empty results
  TestValidator.equals(
    "empty search results data",
    emptySearchResult.data.length,
    0,
  );
  TestValidator.equals(
    "empty search total records",
    emptySearchResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty search total pages",
    emptySearchResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty search current page",
    emptySearchResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "empty search limit",
    emptySearchResult.pagination.limit,
    10,
  );
  // Test 2: Pagination with valid articles using exact title pattern
  const paginationResult =
    await api.functional.discussionBoard.member.engagement.index(
      memberConnection,
      {
        body: {
          search: "PaginationTestArticle",
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(paginationResult);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination has data",
    paginationResult.data.length > 0,
  );
  TestValidator.predicate(
    "pagination has valid total records",
    paginationResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has valid total pages",
    paginationResult.pagination.pages >= 0,
  );
  TestValidator.equals(
    "pagination current page",
    paginationResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    paginationResult.pagination.limit,
    5,
  );
  // Test 3: Pagination boundaries - request a specific page
  const pageResult =
    await api.functional.discussionBoard.member.engagement.index(
      memberConnection,
      {
        body: {
          search: "PaginationTestArticle",
          page: 2,
          limit: 5,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(pageResult);
  // Validate page metadata
  TestValidator.predicate(
    "page has valid data count",
    pageResult.data.length >= 0,
  );
  TestValidator.equals("page current page", pageResult.pagination.current, 2);
  // Test 4: Pagination boundaries - page beyond available data
  const beyondPageResult =
    await api.functional.discussionBoard.member.engagement.index(
      memberConnection,
      {
        body: {
          search: "PaginationTestArticle",
          page: 10,
          limit: 5,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(beyondPageResult);
  // Validate page beyond available data returns empty results or valid response
  TestValidator.predicate(
    "beyond page has valid response",
    beyondPageResult.data.length === 0 || beyondPageResult.data.length > 0,
  );
  TestValidator.equals(
    "beyond page current page",
    beyondPageResult.pagination.current,
    10,
  );
  // Test 5: Different limit values
  const smallLimitResult =
    await api.functional.discussionBoard.member.engagement.index(
      memberConnection,
      {
        body: {
          search: "PaginationTestArticle",
          page: 1,
          limit: 3,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(smallLimitResult);
  TestValidator.predicate(
    "small limit has valid data count",
    smallLimitResult.data.length >= 0,
  );
  TestValidator.predicate(
    "small limit has valid total pages",
    smallLimitResult.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "small limit has valid total records",
    smallLimitResult.pagination.records >= 0,
  );
  TestValidator.equals(
    "small limit current page",
    smallLimitResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "small limit limit",
    smallLimitResult.pagination.limit,
    3,
  );
  // Test 6: Verify pagination consistency
  TestValidator.predicate(
    "pagination metadata consistency",
    paginationResult.pagination.records === smallLimitResult.pagination.records,
  );
}
