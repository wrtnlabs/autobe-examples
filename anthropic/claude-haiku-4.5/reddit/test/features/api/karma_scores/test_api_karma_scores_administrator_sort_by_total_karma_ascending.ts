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
 * Test sorting karma scores by total_karma in ascending order (lowest
 * reputation first).
 *
 * This scenario validates that an administrator can retrieve and analyze member
 * karma scores with sorting capabilities enabled. The test verifies that when
 * an administrator requests karma score data sorted by total_karma in ascending
 * order, the results correctly display members with the lowest reputation
 * scores first, progressing to higher reputation scores.
 *
 * Test workflow:
 *
 * 1. Authenticate as an administrator to gain access to karma score analytics
 * 2. Request paginated karma score data sorted by total_karma field in ascending
 *    order (asc)
 * 3. Validate that the response returns properly paginated karma score summaries
 * 4. Verify that the returned karma scores are correctly sorted from lowest to
 *    highest total_karma
 * 5. Confirm pagination metadata is accurate
 * 6. Validate each karma score summary contains expected fields
 * 7. Ensure sorting order is maintained consistently across the result set
 *
 * This enables administrators to identify members with lowest reputation scores
 * for monitoring and platform management purposes.
 */
export async function test_api_karma_scores_administrator_sort_by_total_karma_ascending(
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
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);
  TestValidator.predicate(
    "administrator authenticated successfully",
    admin.id !== undefined && admin.email === adminEmail,
  );

  // Step 2: Request karma scores sorted by total_karma in ascending order
  const karmaScoresPage1: IPageICommunityPlatformKarmaScore.ISummary =
    await api.functional.communityPlatform.administrator.karmaScores.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          orderBy: "total_karma",
          order: "asc",
        } satisfies ICommunityPlatformKarmaScore.IRequest,
      },
    );
  typia.assert(karmaScoresPage1);

  // Step 3: Validate response structure and pagination metadata
  TestValidator.predicate(
    "karma scores page has pagination metadata",
    karmaScoresPage1.pagination !== undefined,
  );
  TestValidator.predicate(
    "pagination current page is 1",
    karmaScoresPage1.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is 10",
    karmaScoresPage1.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    karmaScoresPage1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is calculated correctly",
    karmaScoresPage1.pagination.pages >= 0,
  );

  // Step 4: Validate karma score data array
  TestValidator.predicate(
    "karma scores data is an array",
    Array.isArray(karmaScoresPage1.data),
  );

  // Step 5: Verify ascending sort order (lowest to highest total_karma)
  if (karmaScoresPage1.data.length > 1) {
    for (let i = 0; i < karmaScoresPage1.data.length - 1; i++) {
      const current = karmaScoresPage1.data[i];
      const next = karmaScoresPage1.data[i + 1];
      TestValidator.predicate(
        `karma score at index ${i} has lower or equal total_karma than next`,
        current.total_karma <= next.total_karma,
      );
    }
  }

  // Step 6: Validate individual karma score fields
  if (karmaScoresPage1.data.length > 0) {
    const firstKarmaScore = karmaScoresPage1.data[0];
    TestValidator.predicate(
      "karma score has id field",
      firstKarmaScore.id !== undefined,
    );
    TestValidator.predicate(
      "karma score has post_karma field",
      firstKarmaScore.post_karma !== undefined &&
        firstKarmaScore.post_karma >= 0,
    );
    TestValidator.predicate(
      "karma score has comment_karma field",
      firstKarmaScore.comment_karma !== undefined &&
        firstKarmaScore.comment_karma >= 0,
    );
    TestValidator.predicate(
      "karma score has total_karma field",
      firstKarmaScore.total_karma !== undefined &&
        firstKarmaScore.total_karma >= 0,
    );
    TestValidator.predicate(
      "karma score has updated_at field",
      firstKarmaScore.updated_at !== undefined,
    );
    TestValidator.predicate(
      "total_karma equals post_karma plus comment_karma",
      firstKarmaScore.total_karma ===
        firstKarmaScore.post_karma + firstKarmaScore.comment_karma,
    );
  }

  // Step 7: Test second page if available
  if (karmaScoresPage1.pagination.pages > 1) {
    const karmaScoresPage2: IPageICommunityPlatformKarmaScore.ISummary =
      await api.functional.communityPlatform.administrator.karmaScores.index(
        connection,
        {
          body: {
            page: 2,
            limit: 10,
            orderBy: "total_karma",
            order: "asc",
          } satisfies ICommunityPlatformKarmaScore.IRequest,
        },
      );
    typia.assert(karmaScoresPage2);

    // Verify page 2 is also sorted in ascending order
    if (karmaScoresPage2.data.length > 1) {
      for (let i = 0; i < karmaScoresPage2.data.length - 1; i++) {
        const current = karmaScoresPage2.data[i];
        const next = karmaScoresPage2.data[i + 1];
        TestValidator.predicate(
          `page 2 karma score at index ${i} has lower or equal total_karma than next`,
          current.total_karma <= next.total_karma,
        );
      }
    }

    // Verify consistency between pages (last of page 1 should be <= first of page 2)
    if (karmaScoresPage1.data.length > 0 && karmaScoresPage2.data.length > 0) {
      const lastPage1 = karmaScoresPage1.data[karmaScoresPage1.data.length - 1];
      const firstPage2 = karmaScoresPage2.data[0];
      TestValidator.predicate(
        "last score of page 1 is less than or equal to first score of page 2",
        lastPage1.total_karma <= firstPage2.total_karma,
      );
    }
  }

  TestValidator.predicate(
    "karma scores sorted by total_karma in ascending order validated successfully",
    true,
  );
}
