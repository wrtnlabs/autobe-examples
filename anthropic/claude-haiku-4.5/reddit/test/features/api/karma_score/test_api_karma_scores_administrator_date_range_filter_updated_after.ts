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
 * Test filtering karma scores by updatedAfter parameter to find members whose
 * karma was recently updated.
 *
 * This test validates that administrators can identify members with recent
 * reputation changes by filtering for karma scores updated after a specified
 * ISO 8601 datetime. The test verifies:
 *
 * 1. Administrator account creation and authentication
 * 2. Retrieval of karma scores with updatedAfter filter for various date
 *    thresholds
 * 3. Validation that filtering correctly includes only records with updated_at >=
 *    specified timestamp
 * 4. Ability to identify members with active voting engagement
 *
 * Process:
 *
 * 1. Create administrator account
 * 2. Query karma scores with updatedAfter filter using past date
 * 3. Query karma scores with updatedAfter filter using future date
 * 4. Verify filtering accuracy and timestamp compliance
 */
export async function test_api_karma_scores_administrator_date_range_filter_updated_after(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphabets(10),
        username: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: null,
        ip: undefined,
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);
  TestValidator.predicate(
    "administrator should be created with valid ID",
    admin.id && admin.id.length > 0,
  );

  // Step 2: Query karma scores with updatedAfter filter using a past date (should return all recent scores)
  const pastDate = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 30 days ago
  const recentScoresResponse: IPageICommunityPlatformKarmaScore.ISummary =
    await api.functional.communityPlatform.administrator.karmaScores.index(
      connection,
      {
        body: {
          page: 1,
          limit: 50,
          orderBy: "updated_at",
          order: "desc",
          updatedAfter: pastDate,
        } satisfies ICommunityPlatformKarmaScore.IRequest,
      },
    );
  typia.assert(recentScoresResponse);
  TestValidator.predicate(
    "response should have pagination data",
    recentScoresResponse.pagination !== undefined,
  );

  // Verify all returned scores have updated_at >= pastDate
  if (recentScoresResponse.data.length > 0) {
    recentScoresResponse.data.forEach((score) => {
      TestValidator.predicate(
        "karma score updated_at should be after or equal to filter date",
        new Date(score.updated_at) >= new Date(pastDate),
      );
    });
  }

  // Step 3: Query karma scores with updatedAfter filter using a future date (should return empty or fewer results)
  const futureDate = new Date(
    Date.now() + 30 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 30 days from now
  const futureScoresResponse: IPageICommunityPlatformKarmaScore.ISummary =
    await api.functional.communityPlatform.administrator.karmaScores.index(
      connection,
      {
        body: {
          page: 1,
          limit: 50,
          orderBy: "updated_at",
          order: "desc",
          updatedAfter: futureDate,
        } satisfies ICommunityPlatformKarmaScore.IRequest,
      },
    );
  typia.assert(futureScoresResponse);

  // Verify all scores returned have updated_at >= futureDate
  if (futureScoresResponse.data.length > 0) {
    futureScoresResponse.data.forEach((score) => {
      TestValidator.predicate(
        "future filtered scores should all have updated_at after future date",
        new Date(score.updated_at) >= new Date(futureDate),
      );
    });
  }

  // Step 4: Query with current timestamp as filter (all scores with updates up to now)
  const nowDate = new Date().toISOString();
  const currentScoresResponse: IPageICommunityPlatformKarmaScore.ISummary =
    await api.functional.communityPlatform.administrator.karmaScores.index(
      connection,
      {
        body: {
          page: 1,
          limit: 50,
          orderBy: "updated_at",
          order: "desc",
          updatedAfter: nowDate,
        } satisfies ICommunityPlatformKarmaScore.IRequest,
      },
    );
  typia.assert(currentScoresResponse);

  // Step 5: Validate filtering consistency
  TestValidator.predicate(
    "future date filter should return equal or fewer results than past date filter",
    futureScoresResponse.pagination.records <=
      recentScoresResponse.pagination.records,
  );

  TestValidator.predicate(
    "pagination metadata should be present in all responses",
    recentScoresResponse.pagination.current >= 1 &&
      recentScoresResponse.pagination.limit > 0,
  );

  // Step 6: Verify timestamp ordering when orderBy is updated_at
  if (recentScoresResponse.data.length > 1) {
    for (let i = 0; i < recentScoresResponse.data.length - 1; i++) {
      const current = new Date(recentScoresResponse.data[i].updated_at);
      const next = new Date(recentScoresResponse.data[i + 1].updated_at);
      TestValidator.predicate(
        "descending order: current score should have updated_at >= next score",
        current >= next,
      );
    }
  }
}
