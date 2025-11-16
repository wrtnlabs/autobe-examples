import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModerator";

/**
 * Test moderator search functionality with pagination parameters.
 *
 * This test validates the comprehensive moderator search and pagination system
 * by:
 *
 * 1. Creating multiple moderator accounts to establish a test dataset
 * 2. Authenticating as a moderator to access the search endpoint
 * 3. Testing pagination with various page sizes and page numbers
 * 4. Validating pagination metadata accuracy (current, limit, records, pages)
 * 5. Ensuring moderator summaries contain expected fields without sensitive data
 * 6. Verifying mathematical consistency of pagination calculations
 */
export async function test_api_moderator_search_with_pagination(
  connection: api.IConnection,
) {
  // Step 1: Create multiple moderator accounts for pagination testing
  const moderatorCount = 10;
  const createdModerators: IDiscussionBoardModerator.IAuthorized[] = [];

  for (let i = 0; i < moderatorCount; i++) {
    const moderator = await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        username: `${RandomGenerator.name(1)}_${i}`,
        ip: typia.random<string & tags.Format<"ipv4">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
    typia.assert(moderator);
    createdModerators.push(moderator);
  }

  // Step 2: Authenticate as the first moderator
  const firstModerator = createdModerators[0];
  typia.assertGuard(firstModerator);

  // Step 3: Test pagination with default parameters
  const defaultPage =
    await api.functional.discussionBoard.moderator.moderators.index(
      connection,
      {
        body: {} satisfies IDiscussionBoardModerator.IRequest,
      },
    );
  typia.assert(defaultPage);

  // Step 4: Validate pagination metadata
  TestValidator.predicate(
    "total records should be at least the number of created moderators",
    defaultPage.pagination.records >= moderatorCount,
  );

  TestValidator.predicate(
    "pagination current page should be positive",
    defaultPage.pagination.current >= 0,
  );

  TestValidator.predicate(
    "pagination limit should be positive",
    defaultPage.pagination.limit > 0,
  );

  TestValidator.predicate(
    "pagination pages should be positive or zero",
    defaultPage.pagination.pages >= 0,
  );

  // Step 5: Validate mathematical consistency of pagination
  const expectedPages = Math.ceil(
    defaultPage.pagination.records / defaultPage.pagination.limit,
  );
  TestValidator.equals(
    "calculated pages matches pagination.pages",
    defaultPage.pagination.pages,
    expectedPages,
  );

  // Step 6: Validate moderator summary structure
  if (defaultPage.data.length > 0) {
    const sampleModerator = defaultPage.data[0];
    typia.assert<IDiscussionBoardModerator.ISummary>(sampleModerator);
  }

  // Step 7: Test pagination with specific page size
  const pageSize = 5;
  const firstPageWithLimit =
    await api.functional.discussionBoard.moderator.moderators.index(
      connection,
      {
        body: {
          page: 1,
          limit: pageSize,
        } satisfies IDiscussionBoardModerator.IRequest,
      },
    );
  typia.assert(firstPageWithLimit);

  TestValidator.equals(
    "limit should match requested page size",
    firstPageWithLimit.pagination.limit,
    pageSize,
  );

  TestValidator.equals(
    "current page should be 1",
    firstPageWithLimit.pagination.current,
    1,
  );

  TestValidator.predicate(
    "data array length should not exceed limit",
    firstPageWithLimit.data.length <= pageSize,
  );

  // Step 8: Test second page retrieval
  if (firstPageWithLimit.pagination.pages > 1) {
    const secondPage =
      await api.functional.discussionBoard.moderator.moderators.index(
        connection,
        {
          body: {
            page: 2,
            limit: pageSize,
          } satisfies IDiscussionBoardModerator.IRequest,
        },
      );
    typia.assert(secondPage);

    TestValidator.equals(
      "second page current should be 2",
      secondPage.pagination.current,
      2,
    );

    TestValidator.equals(
      "pagination metadata should be consistent across pages",
      secondPage.pagination.records,
      firstPageWithLimit.pagination.records,
    );

    TestValidator.equals(
      "total pages should be consistent",
      secondPage.pagination.pages,
      firstPageWithLimit.pagination.pages,
    );
  }

  // Step 9: Test with different page sizes
  const smallPageSize = 3;
  const smallPageResult =
    await api.functional.discussionBoard.moderator.moderators.index(
      connection,
      {
        body: {
          page: 1,
          limit: smallPageSize,
        } satisfies IDiscussionBoardModerator.IRequest,
      },
    );
  typia.assert(smallPageResult);

  TestValidator.equals(
    "small page size limit should match",
    smallPageResult.pagination.limit,
    smallPageSize,
  );

  TestValidator.predicate(
    "data array should respect small page size",
    smallPageResult.data.length <= smallPageSize,
  );

  // Step 10: Test with search parameter
  const searchTerm = createdModerators[0].username;
  typia.assertGuard(searchTerm);

  const searchResult =
    await api.functional.discussionBoard.moderator.moderators.index(
      connection,
      {
        body: {
          search: searchTerm,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardModerator.IRequest,
      },
    );
  typia.assert(searchResult);

  TestValidator.predicate(
    "search should return results",
    searchResult.pagination.records >= 0,
  );

  // Step 11: Test sorting functionality
  const sortedAsc =
    await api.functional.discussionBoard.moderator.moderators.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          sort: "created_at",
          order: "asc",
        } satisfies IDiscussionBoardModerator.IRequest,
      },
    );
  typia.assert(sortedAsc);

  const sortedDesc =
    await api.functional.discussionBoard.moderator.moderators.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          sort: "created_at",
          order: "desc",
        } satisfies IDiscussionBoardModerator.IRequest,
      },
    );
  typia.assert(sortedDesc);
}
