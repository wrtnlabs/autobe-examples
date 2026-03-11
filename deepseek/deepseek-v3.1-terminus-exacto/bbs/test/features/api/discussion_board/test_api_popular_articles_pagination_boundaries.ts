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

export async function test_api_popular_articles_pagination_boundaries(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection
  const memberConnection: api.IConnection = { host: connection.host };
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
  // Note: Since we cannot create sections (no section creation endpoint available),
  // we'll test with the existing pagination functionality using available articles
  // This tests the pagination mechanics without relying on specific popularity ranking
  // Test pagination with different limit values
  const limitValues = [1, 10, 100] as const;
  for (const limit of limitValues) {
    // Test first page
    const firstPage = await api.functional.discussionBoard.member.popular.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: limit satisfies number as number,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
    typia.assert(firstPage);
    // Validate pagination metadata structure
    TestValidator.equals(
      `first page current should be 1 for limit ${limit}`,
      firstPage.pagination.current,
      1,
    );
    TestValidator.equals(
      `first page limit should match ${limit}`,
      firstPage.pagination.limit,
      limit,
    );
    TestValidator.predicate(
      `first page records should be non-negative for limit ${limit}`,
      firstPage.pagination.records >= 0,
    );
    TestValidator.predicate(
      `first page pages should be calculated correctly for limit ${limit}`,
      firstPage.pagination.pages ===
        Math.ceil(firstPage.pagination.records / limit) ||
        (firstPage.pagination.records === 0 &&
          firstPage.pagination.pages === 0),
    );
    // Only test last page if there are multiple pages
    if (firstPage.pagination.pages > 1) {
      const lastPage =
        await api.functional.discussionBoard.member.popular.index(
          memberConnection,
          {
            body: {
              page: firstPage.pagination.pages,
              limit: limit satisfies number as number,
            } satisfies IDiscussionBoardArticle.IRequest,
          },
        );
      typia.assert(lastPage);
      TestValidator.equals(
        `last page current should match total pages for limit ${limit}`,
        lastPage.pagination.current,
        firstPage.pagination.pages,
      );
      TestValidator.equals(
        `last page limit should match ${limit}`,
        lastPage.pagination.limit,
        limit,
      );
    }
    // Test page beyond total pages (if there are pages)
    if (firstPage.pagination.pages > 0) {
      const beyondPage =
        await api.functional.discussionBoard.member.popular.index(
          memberConnection,
          {
            body: {
              page: firstPage.pagination.pages + 1,
              limit: limit satisfies number as number,
            } satisfies IDiscussionBoardArticle.IRequest,
          },
        );
      typia.assert(beyondPage);
      TestValidator.equals(
        `beyond page data should be empty for limit ${limit}`,
        beyondPage.data.length,
        0,
      );
      TestValidator.equals(
        `beyond page current should be beyond total pages for limit ${limit}`,
        beyondPage.pagination.current,
        firstPage.pagination.pages + 1,
      );
    }
  }
  // Test consistency across pagination boundaries with a specific limit
  const limit = 5;
  const totalPagesRequest =
    await api.functional.discussionBoard.member.popular.index(
      memberConnection,
      {
        body: {
          limit: limit satisfies number as number,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(totalPagesRequest);
  const totalPages = totalPagesRequest.pagination.pages;
  // Only test pagination consistency if there are multiple pages
  if (totalPages > 1) {
    // Collect all articles from all pages
    const allArticlesFromPages = [];
    for (let page = 1; page <= totalPages; page++) {
      const pageResult =
        await api.functional.discussionBoard.member.popular.index(
          memberConnection,
          {
            body: {
              page: page satisfies number as number,
              limit: limit satisfies number as number,
            } satisfies IDiscussionBoardArticle.IRequest,
          },
        );
      typia.assert(pageResult);
      allArticlesFromPages.push(...pageResult.data);
    }
    // Verify no duplicates across pagination (if we got articles)
    if (allArticlesFromPages.length > 0) {
      const articleIds = allArticlesFromPages.map((article) => article.id);
      const uniqueArticleIds = new Set(articleIds);
      TestValidator.equals(
        "no duplicate articles across pagination",
        articleIds.length,
        uniqueArticleIds.size,
      );
    }
  }
  // Test minimum limit value (1)
  const minLimitPage =
    await api.functional.discussionBoard.member.popular.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 1 satisfies number as number,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(minLimitPage);
  TestValidator.predicate(
    "minimum limit page should have valid pagination",
    minLimitPage.pagination.limit === 1 &&
      minLimitPage.pagination.current === 1,
  );
  // Test maximum limit value (100)
  const maxLimitPage =
    await api.functional.discussionBoard.member.popular.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 100 satisfies number as number,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(maxLimitPage);
  TestValidator.predicate(
    "maximum limit page should have valid pagination",
    maxLimitPage.pagination.limit === 100 &&
      maxLimitPage.pagination.current === 1,
  );
}
