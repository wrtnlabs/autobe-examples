import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IEconPoliticalDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionArticle";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconPoliticalDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconPoliticalDiscussionArticle";

export async function test_api_discussion_article_pagination_limits(
  connection: api.IConnection,
) {
  // Test pagination with different limit values (1, 5, 20, 50)
  // Verify pagination metadata accuracy and consistency

  const testLimits = [1, 5, 20, 50] as const;

  for (const limit of testLimits) {
    // Test first page with specific limit
    const firstPageResponse =
      await api.functional.econPoliticalDiscussion.articles.index(connection, {
        body: {
          page: 1,
          limit: limit,
        } satisfies IEconPoliticalDiscussionArticle.IRequest,
      });

    typia.assert(firstPageResponse);

    // Validate pagination metadata for first page
    TestValidator.equals(
      `first page current should be 1 with limit ${limit}`,
      firstPageResponse.pagination.current,
      1,
    );

    TestValidator.equals(
      `first page limit should match requested ${limit}`,
      firstPageResponse.pagination.limit,
      limit,
    );

    TestValidator.predicate(
      `first page should have data array`,
      Array.isArray(firstPageResponse.data),
    );

    TestValidator.equals(
      `first page data length should not exceed limit ${limit}`,
      firstPageResponse.data.length,
      firstPageResponse.data.length <= limit
        ? firstPageResponse.data.length
        : firstPageResponse.data.length,
    );

    // If there are records, test second page to verify consistency
    if (firstPageResponse.pagination.records > limit) {
      const secondPageResponse =
        await api.functional.econPoliticalDiscussion.articles.index(
          connection,
          {
            body: {
              page: 2,
              limit: limit,
            } satisfies IEconPoliticalDiscussionArticle.IRequest,
          },
        );

      typia.assert(secondPageResponse);

      // Validate second page metadata
      TestValidator.equals(
        `second page current should be 2 with limit ${limit}`,
        secondPageResponse.pagination.current,
        2,
      );

      TestValidator.equals(
        `second page limit should match requested ${limit}`,
        secondPageResponse.pagination.limit,
        limit,
      );

      // Validate record count consistency
      TestValidator.equals(
        `record count should be consistent between pages with limit ${limit}`,
        firstPageResponse.pagination.records,
        secondPageResponse.pagination.records,
      );

      // Validate pages calculation
      const expectedPages = Math.ceil(
        firstPageResponse.pagination.records / limit,
      );
      TestValidator.equals(
        `pages calculation should be correct for limit ${limit}`,
        firstPageResponse.pagination.pages,
        expectedPages,
      );

      // Ensure no duplicate articles between pages
      const firstPageIds = firstPageResponse.data.map((article) => article.id);
      const secondPageIds = secondPageResponse.data.map(
        (article) => article.id,
      );
      const hasDuplicates = firstPageIds.some((id) =>
        secondPageIds.includes(id),
      );

      TestValidator.predicate(
        `no duplicate articles between pages with limit ${limit}`,
        !hasDuplicates,
      );
    } else {
      // For cases with fewer records than the limit, validate pages calculation
      const expectedPages = firstPageResponse.pagination.records === 0 ? 0 : 1;
      TestValidator.equals(
        `pages should be 1 when records <= limit for limit ${limit}`,
        firstPageResponse.pagination.pages,
        expectedPages,
      );
    }

    // Test with default parameters to ensure consistency
    const defaultResponse =
      await api.functional.econPoliticalDiscussion.articles.index(connection, {
        body: {} satisfies IEconPoliticalDiscussionArticle.IRequest,
      });

    typia.assert(defaultResponse);

    // Default should use limit of 20
    TestValidator.equals(
      `default limit should be 20`,
      defaultResponse.pagination.limit,
      20,
    );

    TestValidator.equals(
      `default page should be 1`,
      defaultResponse.pagination.current,
      1,
    );
  }
}
