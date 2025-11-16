import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaScore";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformKarmaScore";

/**
 * Test filtering karma scores by the updatedBefore parameter to identify
 * members whose karma has not been updated recently.
 *
 * This test validates that administrators can filter karma scores by an upper
 * boundary timestamp (updatedBefore) to find members with stale records. The
 * test:
 *
 * 1. Authenticates as an administrator
 * 2. Queries all karma scores without filtering
 * 3. Tests filtering with various updatedBefore timestamps
 * 4. Validates that results include only scores updated before/at the specified
 *    time
 * 5. Verifies pagination and sorting work correctly with date filtering
 *
 * This enables identification of inactive members or those who haven't received
 * votes recently for administrative analysis and reporting.
 */
export async function test_api_karma_scores_administrator_date_range_filter_updated_before(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const administrator: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphabets(12),
        username: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: null,
        ip: undefined,
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(administrator);
  TestValidator.predicate(
    "administrator authentication successful",
    administrator.id !== undefined && administrator.email === adminEmail,
  );

  // Step 2: Query all karma scores without filtering
  const allScoresResponse: IPageICommunityPlatformKarmaScore.ISummary =
    await api.functional.communityPlatform.administrator.karmaScores.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          orderBy: "updated_at",
          order: "desc",
        } satisfies ICommunityPlatformKarmaScore.IRequest,
      },
    );
  typia.assert(allScoresResponse);
  TestValidator.predicate(
    "all scores query returns valid pagination",
    allScoresResponse.pagination.current > 0 &&
      allScoresResponse.pagination.limit > 0,
  );

  // Step 3: Extract various timestamps from the results for testing
  if (allScoresResponse.data.length > 0) {
    // Test with a timestamp in the future (should include all records)
    const futureTimestamp = new Date(Date.now() + 86400000).toISOString(); // 1 day in future
    const futureResponse: IPageICommunityPlatformKarmaScore.ISummary =
      await api.functional.communityPlatform.administrator.karmaScores.index(
        connection,
        {
          body: {
            page: 1,
            limit: 10,
            updatedBefore: futureTimestamp,
            orderBy: "updated_at",
            order: "desc",
          } satisfies ICommunityPlatformKarmaScore.IRequest,
        },
      );
    typia.assert(futureResponse);
    TestValidator.predicate(
      "future timestamp includes all records",
      futureResponse.data.length > 0,
    );

    // Validate all returned scores have updated_at <= futureTimestamp
    futureResponse.data.forEach((score) => {
      TestValidator.predicate(
        "karma score updated_at is before or at future timestamp",
        new Date(score.updated_at) <= new Date(futureTimestamp),
      );
    });

    // Test with the most recent timestamp from results
    const mostRecentScore = allScoresResponse.data[0];
    const recentTimestamp = mostRecentScore.updated_at;

    const recentResponse: IPageICommunityPlatformKarmaScore.ISummary =
      await api.functional.communityPlatform.administrator.karmaScores.index(
        connection,
        {
          body: {
            page: 1,
            limit: 10,
            updatedBefore: recentTimestamp,
            orderBy: "updated_at",
            order: "desc",
          } satisfies ICommunityPlatformKarmaScore.IRequest,
        },
      );
    typia.assert(recentResponse);

    // Validate all returned scores have updated_at <= recentTimestamp
    recentResponse.data.forEach((score) => {
      TestValidator.predicate(
        "karma score updated_at is before or at recent timestamp",
        new Date(score.updated_at) <= new Date(recentTimestamp),
      );
    });

    // Test with an older timestamp (should include fewer or equal records)
    if (allScoresResponse.data.length > 1) {
      const oldestScore =
        allScoresResponse.data[allScoresResponse.data.length - 1];
      const olderTimestamp = new Date(
        new Date(oldestScore.updated_at).getTime() - 86400000,
      ).toISOString(); // 1 day before oldest

      const olderResponse: IPageICommunityPlatformKarmaScore.ISummary =
        await api.functional.communityPlatform.administrator.karmaScores.index(
          connection,
          {
            body: {
              page: 1,
              limit: 10,
              updatedBefore: olderTimestamp,
              orderBy: "updated_at",
              order: "desc",
            } satisfies ICommunityPlatformKarmaScore.IRequest,
          },
        );
      typia.assert(olderResponse);

      // Validate all returned scores have updated_at <= olderTimestamp
      olderResponse.data.forEach((score) => {
        TestValidator.predicate(
          "karma score updated_at is before or at older timestamp",
          new Date(score.updated_at) <= new Date(olderTimestamp),
        );
      });
    }

    // Step 4: Test with combined filtering (updatedBefore + other filters)
    const combinedResponse: IPageICommunityPlatformKarmaScore.ISummary =
      await api.functional.communityPlatform.administrator.karmaScores.index(
        connection,
        {
          body: {
            page: 1,
            limit: 5,
            updatedBefore: futureTimestamp,
            minTotalKarma: 0,
            orderBy: "total_karma",
            order: "desc",
          } satisfies ICommunityPlatformKarmaScore.IRequest,
        },
      );
    typia.assert(combinedResponse);
    TestValidator.predicate(
      "combined filtering returns valid results",
      combinedResponse.data.length <= 5,
    );

    // Validate all scores meet the combined criteria
    combinedResponse.data.forEach((score) => {
      TestValidator.predicate(
        "score updated_at meets updatedBefore filter",
        new Date(score.updated_at) <= new Date(futureTimestamp),
      );
      TestValidator.predicate(
        "score total_karma meets minTotalKarma filter",
        score.total_karma >= 0,
      );
    });
  }

  // Step 5: Test pagination with updatedBefore filter
  const paginatedResponse: IPageICommunityPlatformKarmaScore.ISummary =
    await api.functional.communityPlatform.administrator.karmaScores.index(
      connection,
      {
        body: {
          page: 1,
          limit: 3,
          updatedBefore: new Date(Date.now() + 86400000).toISOString(),
          orderBy: "updated_at",
          order: "desc",
        } satisfies ICommunityPlatformKarmaScore.IRequest,
      },
    );
  typia.assert(paginatedResponse);
  TestValidator.predicate(
    "pagination metadata is valid",
    paginatedResponse.pagination.current === 1 &&
      paginatedResponse.pagination.limit === 3 &&
      paginatedResponse.pagination.pages >= 0 &&
      paginatedResponse.pagination.records >= 0,
  );
}
