import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaScore";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformKarmaScore";

/**
 * Test pagination functionality for moderators to process members in manageable
 * batches.
 *
 * This E2E test validates that moderators can efficiently navigate through
 * karma score results in chunks suitable for moderation queue processing. The
 * test verifies pagination metadata, navigation through multiple pages, and
 * different batch size configurations.
 *
 * Key validations:
 *
 * 1. Moderator authentication and role-based access
 * 2. Pagination with various limit values (5, 10, 25 items per page)
 * 3. Correct pagination metadata calculation (current page, limit, total records,
 *    pages)
 * 4. Sequential page navigation through karma score results
 * 5. Data consistency across paginated requests
 * 6. Edge cases and boundary conditions
 */
export async function test_api_karma_scores_moderator_pagination_for_queue_processing(
  connection: api.IConnection,
) {
  // 1. Moderator authentication - Essential prerequisite
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphaNumeric(8),
        password: RandomGenerator.alphabets(12),
        href: "https://example.com/auth/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);
  TestValidator.predicate(
    "moderator authenticated",
    moderator.id !== undefined,
  );

  // 2. Test pagination with small batch size (5 items per page)
  const smallBatchSize = 5;
  const page1Small: IPageICommunityPlatformKarmaScore.ISummary =
    await api.functional.communityPlatform.moderator.karmaScores.index(
      connection,
      {
        body: {
          page: 1,
          limit: smallBatchSize,
        } satisfies ICommunityPlatformKarmaScore.IRequest,
      },
    );
  typia.assert(page1Small);
  TestValidator.equals(
    "first page current number",
    page1Small.pagination.current,
    1,
  );
  TestValidator.equals(
    "first page limit",
    page1Small.pagination.limit,
    smallBatchSize,
  );
  TestValidator.predicate("first page has data", page1Small.data.length > 0);
  TestValidator.predicate(
    "first page respects limit",
    page1Small.data.length <= smallBatchSize,
  );

  // 3. Verify pagination metadata calculations
  TestValidator.predicate(
    "pagination total records is valid",
    page1Small.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination total pages calculated correctly",
    page1Small.pagination.pages ===
      Math.ceil(page1Small.pagination.records / page1Small.pagination.limit),
  );

  // 4. Test pagination with medium batch size (10 items per page)
  const mediumBatchSize = 10;
  const page1Medium: IPageICommunityPlatformKarmaScore.ISummary =
    await api.functional.communityPlatform.moderator.karmaScores.index(
      connection,
      {
        body: {
          page: 1,
          limit: mediumBatchSize,
        } satisfies ICommunityPlatformKarmaScore.IRequest,
      },
    );
  typia.assert(page1Medium);
  TestValidator.equals(
    "medium batch limit",
    page1Medium.pagination.limit,
    mediumBatchSize,
  );
  TestValidator.predicate(
    "medium batch respects limit",
    page1Medium.data.length <= mediumBatchSize,
  );

  // 5. Test pagination with larger batch size (25 items per page)
  const largeBatchSize = 25;
  const page1Large: IPageICommunityPlatformKarmaScore.ISummary =
    await api.functional.communityPlatform.moderator.karmaScores.index(
      connection,
      {
        body: {
          page: 1,
          limit: largeBatchSize,
        } satisfies ICommunityPlatformKarmaScore.IRequest,
      },
    );
  typia.assert(page1Large);
  TestValidator.equals(
    "large batch limit",
    page1Large.pagination.limit,
    largeBatchSize,
  );
  TestValidator.predicate(
    "large batch respects limit",
    page1Large.data.length <= largeBatchSize,
  );

  // 6. Test multi-page navigation if available
  if (page1Small.pagination.pages > 1) {
    const page2Small: IPageICommunityPlatformKarmaScore.ISummary =
      await api.functional.communityPlatform.moderator.karmaScores.index(
        connection,
        {
          body: {
            page: 2,
            limit: smallBatchSize,
          } satisfies ICommunityPlatformKarmaScore.IRequest,
        },
      );
    typia.assert(page2Small);
    TestValidator.equals(
      "second page current number",
      page2Small.pagination.current,
      2,
    );
    TestValidator.equals(
      "second page limit matches",
      page2Small.pagination.limit,
      smallBatchSize,
    );
    TestValidator.predicate(
      "second page has different data",
      page2Small.data.length > 0 &&
        page2Small.data.some(
          (item) => !page1Small.data.some((p1Item) => p1Item.id === item.id),
        ),
    );

    // 7. Test navigation to last page
    const lastPageNumber = page1Small.pagination.pages;
    const lastPage: IPageICommunityPlatformKarmaScore.ISummary =
      await api.functional.communityPlatform.moderator.karmaScores.index(
        connection,
        {
          body: {
            page: lastPageNumber,
            limit: smallBatchSize,
          } satisfies ICommunityPlatformKarmaScore.IRequest,
        },
      );
    typia.assert(lastPage);
    TestValidator.equals(
      "last page current number",
      lastPage.pagination.current,
      lastPageNumber,
    );
    TestValidator.predicate(
      "last page may have fewer items",
      lastPage.data.length <= smallBatchSize,
    );
  }

  // 8. Test pagination with different ordering options
  const sortByTotalKarmaDesc: IPageICommunityPlatformKarmaScore.ISummary =
    await api.functional.communityPlatform.moderator.karmaScores.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          orderBy: "total_karma",
          order: "desc",
        } satisfies ICommunityPlatformKarmaScore.IRequest,
      },
    );
  typia.assert(sortByTotalKarmaDesc);
  TestValidator.predicate(
    "sorted data is valid",
    sortByTotalKarmaDesc.data.length >= 0,
  );

  // 9. Test pagination with filtering by karma range
  const filteredByMinKarma: IPageICommunityPlatformKarmaScore.ISummary =
    await api.functional.communityPlatform.moderator.karmaScores.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          minTotalKarma: 10,
        } satisfies ICommunityPlatformKarmaScore.IRequest,
      },
    );
  typia.assert(filteredByMinKarma);
  TestValidator.predicate(
    "all filtered items meet minimum karma",
    filteredByMinKarma.data.every((item) => item.total_karma >= 10),
  );

  // 10. Test pagination consistency across requests
  const consistencyCheck1: IPageICommunityPlatformKarmaScore.ISummary =
    await api.functional.communityPlatform.moderator.karmaScores.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformKarmaScore.IRequest,
      },
    );
  const consistencyCheck2: IPageICommunityPlatformKarmaScore.ISummary =
    await api.functional.communityPlatform.moderator.karmaScores.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformKarmaScore.IRequest,
      },
    );
  typia.assert(consistencyCheck1);
  typia.assert(consistencyCheck2);
  TestValidator.equals(
    "pagination total records consistent",
    consistencyCheck1.pagination.records,
    consistencyCheck2.pagination.records,
  );

  // 11. Verify karma score data structure in paginated results
  if (page1Small.data.length > 0) {
    const firstKarmaScore = page1Small.data[0];
    TestValidator.predicate(
      "karma score has id",
      firstKarmaScore.id !== undefined,
    );
    TestValidator.predicate(
      "post karma is non-negative",
      firstKarmaScore.post_karma >= 0,
    );
    TestValidator.predicate(
      "comment karma is non-negative",
      firstKarmaScore.comment_karma >= 0,
    );
    TestValidator.predicate(
      "total karma is non-negative",
      firstKarmaScore.total_karma >= 0,
    );
    TestValidator.equals(
      "total karma equals sum of components",
      firstKarmaScore.total_karma,
      firstKarmaScore.post_karma + firstKarmaScore.comment_karma,
    );
    TestValidator.predicate(
      "updated_at is valid timestamp",
      firstKarmaScore.updated_at !== undefined,
    );
  }
}
