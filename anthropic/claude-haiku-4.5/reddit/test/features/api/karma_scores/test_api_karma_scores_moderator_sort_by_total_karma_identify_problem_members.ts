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
 * Test sorting karma scores in ascending order to identify low-reputation
 * members.
 *
 * This test validates the moderator's ability to identify potentially
 * problematic community members by sorting karma scores from lowest to highest.
 * Low reputation scores indicate members with minimal community trust, helping
 * moderators prioritize moderation efforts and intervention strategies.
 *
 * Test workflow:
 *
 * 1. Register a moderator account to establish authentication
 * 2. Retrieve karma scores sorted by total_karma in ascending order (asc)
 * 3. Verify that results are properly sorted with lowest scores first
 * 4. Validate pagination works correctly for navigating member lists
 * 5. Ensure low-reputation members are properly surfaced for moderation review
 */
export async function test_api_karma_scores_moderator_sort_by_total_karma_identify_problem_members(
  connection: api.IConnection,
) {
  // Step 1: Register a moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphabets(10),
        password: RandomGenerator.alphaNumeric(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);
  TestValidator.equals(
    "moderator email matches registration email",
    moderator.email,
    moderatorEmail,
  );

  // Step 2: Retrieve karma scores sorted by total_karma in ascending order
  const karmaScoresPage: IPageICommunityPlatformKarmaScore.ISummary =
    await api.functional.communityPlatform.moderator.karmaScores.index(
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
  typia.assert(karmaScoresPage);

  // Step 3: Verify pagination metadata
  TestValidator.predicate(
    "pagination contains valid page information",
    karmaScoresPage.pagination.current >= 0 &&
      karmaScoresPage.pagination.limit > 0 &&
      karmaScoresPage.pagination.records >= 0 &&
      karmaScoresPage.pagination.pages >= 0,
  );

  // Step 4: Verify sorting - ascending order means lowest scores first
  if (karmaScoresPage.data.length > 1) {
    for (let i = 1; i < karmaScoresPage.data.length; i++) {
      TestValidator.predicate(
        `karma scores are sorted in ascending order at index ${i}`,
        karmaScoresPage.data[i - 1].total_karma <=
          karmaScoresPage.data[i].total_karma,
      );
    }
  }

  // Step 5: Verify all karma scores are valid and non-negative
  for (const karmaScore of karmaScoresPage.data) {
    typia.assert(karmaScore);
    TestValidator.predicate(
      "total karma is non-negative",
      karmaScore.total_karma >= 0,
    );
    TestValidator.predicate(
      "post karma is non-negative",
      karmaScore.post_karma >= 0,
    );
    TestValidator.predicate(
      "comment karma is non-negative",
      karmaScore.comment_karma >= 0,
    );
  }

  // Step 6: Test pagination with different page limits
  if (karmaScoresPage.pagination.pages > 1) {
    const secondPageScores: IPageICommunityPlatformKarmaScore.ISummary =
      await api.functional.communityPlatform.moderator.karmaScores.index(
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
    typia.assert(secondPageScores);
    TestValidator.equals(
      "second page has correct page number",
      secondPageScores.pagination.current,
      2,
    );

    // Verify second page scores continue ascending from first page
    if (karmaScoresPage.data.length > 0 && secondPageScores.data.length > 0) {
      TestValidator.predicate(
        "second page starts at or after first page lowest score",
        karmaScoresPage.data[karmaScoresPage.data.length - 1].total_karma <=
          secondPageScores.data[0].total_karma,
      );
    }
  }

  // Step 7: Test filtering by low karma threshold to identify problem members
  const lowKarmaThreshold = 10;
  const lowKarmaMembers: IPageICommunityPlatformKarmaScore.ISummary =
    await api.functional.communityPlatform.moderator.karmaScores.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          orderBy: "total_karma",
          order: "asc",
          maxTotalKarma: lowKarmaThreshold,
        } satisfies ICommunityPlatformKarmaScore.IRequest,
      },
    );
  typia.assert(lowKarmaMembers);

  // Verify all returned members have karma <= threshold
  for (const member of lowKarmaMembers.data) {
    TestValidator.predicate(
      "member total karma within low threshold",
      member.total_karma <= lowKarmaThreshold,
    );
  }
}
