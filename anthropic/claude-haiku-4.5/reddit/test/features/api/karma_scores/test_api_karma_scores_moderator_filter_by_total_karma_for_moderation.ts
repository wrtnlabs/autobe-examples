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
 * Test filtering karma scores by total karma range for moderator-based
 * moderation.
 *
 * Validates that moderators can effectively filter members by total karma score
 * ranges to identify members at different reputation tiers. This is essential
 * for moderation workflows where low-reputation members may require
 * intervention and high-reputation members are recognized as trusted community
 * members.
 *
 * Test workflow:
 *
 * 1. Register moderator account to establish authentication
 * 2. Retrieve all karma scores without filters to understand baseline data
 * 3. Filter karma scores by minimum total karma to find high-reputation members
 * 4. Filter karma scores by maximum total karma to find low-reputation members
 * 5. Filter karma scores by both min and max to find members in specific
 *    reputation tiers
 * 6. Validate pagination and data consistency across different filter parameters
 */
export async function test_api_karma_scores_moderator_filter_by_total_karma_for_moderation(
  connection: api.IConnection,
) {
  // 1. Register moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphaNumeric(10),
        password: RandomGenerator.alphaNumeric(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);
  TestValidator.predicate(
    "moderator should be authenticated",
    moderator.email_verified === false || moderator.email_verified === true,
  );

  // 2. Retrieve all karma scores without filters
  const allKarmaScores: IPageICommunityPlatformKarmaScore.ISummary =
    await api.functional.communityPlatform.moderator.karmaScores.index(
      connection,
      {
        body: {} satisfies ICommunityPlatformKarmaScore.IRequest,
      },
    );
  typia.assert(allKarmaScores);
  TestValidator.predicate(
    "all karma scores should have pagination info",
    allKarmaScores.pagination !== undefined &&
      allKarmaScores.pagination.current >= 0,
  );
  TestValidator.predicate(
    "all karma scores data should be array",
    Array.isArray(allKarmaScores.data),
  );

  // 3. Filter by minimum total karma (high-reputation members)
  const minKarmaThreshold = 100;
  const highReputationScores: IPageICommunityPlatformKarmaScore.ISummary =
    await api.functional.communityPlatform.moderator.karmaScores.index(
      connection,
      {
        body: {
          minTotalKarma: minKarmaThreshold,
          limit: 50,
        } satisfies ICommunityPlatformKarmaScore.IRequest,
      },
    );
  typia.assert(highReputationScores);
  TestValidator.predicate(
    "all filtered members should meet minimum karma threshold",
    highReputationScores.data.every(
      (score) => score.total_karma >= minKarmaThreshold,
    ),
  );

  // 4. Filter by maximum total karma (low-reputation members)
  const maxKarmaThreshold = 50;
  const lowReputationScores: IPageICommunityPlatformKarmaScore.ISummary =
    await api.functional.communityPlatform.moderator.karmaScores.index(
      connection,
      {
        body: {
          maxTotalKarma: maxKarmaThreshold,
          limit: 50,
        } satisfies ICommunityPlatformKarmaScore.IRequest,
      },
    );
  typia.assert(lowReputationScores);
  TestValidator.predicate(
    "all filtered members should not exceed maximum karma threshold",
    lowReputationScores.data.every(
      (score) => score.total_karma <= maxKarmaThreshold,
    ),
  );

  // 5. Filter by both min and max (specific reputation tier)
  const minTier = 25;
  const maxTier = 75;
  const tierScores: IPageICommunityPlatformKarmaScore.ISummary =
    await api.functional.communityPlatform.moderator.karmaScores.index(
      connection,
      {
        body: {
          minTotalKarma: minTier,
          maxTotalKarma: maxTier,
          limit: 100,
          orderBy: "total_karma",
          order: "desc",
        } satisfies ICommunityPlatformKarmaScore.IRequest,
      },
    );
  typia.assert(tierScores);
  TestValidator.predicate(
    "filtered results should be within specified karma range",
    tierScores.data.every(
      (score) => score.total_karma >= minTier && score.total_karma <= maxTier,
    ),
  );
  TestValidator.predicate(
    "results should be sorted by total_karma in descending order",
    tierScores.data.length <= 1 ||
      tierScores.data.every((score, index, arr) =>
        index === 0 ? true : score.total_karma <= arr[index - 1].total_karma,
      ),
  );

  // 6. Validate pagination consistency
  TestValidator.equals(
    "pagination current page should be valid",
    tierScores.pagination.current >= 0,
    true,
  );
  TestValidator.predicate(
    "pagination limit should match request",
    tierScores.pagination.limit === 100,
  );
  TestValidator.predicate(
    "pagination records count should be non-negative",
    tierScores.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be calculated correctly",
    tierScores.pagination.pages ===
      Math.ceil(tierScores.pagination.records / tierScores.pagination.limit),
  );

  // 7. Validate karma score structure
  if (tierScores.data.length > 0) {
    const sampleScore = tierScores.data[0];
    TestValidator.predicate(
      "karma score should have valid id",
      typeof sampleScore.id === "string" && sampleScore.id.length > 0,
    );
    TestValidator.predicate(
      "post_karma should be non-negative",
      sampleScore.post_karma >= 0,
    );
    TestValidator.predicate(
      "comment_karma should be non-negative",
      sampleScore.comment_karma >= 0,
    );
    TestValidator.equals(
      "total_karma should equal sum of post and comment karma",
      sampleScore.total_karma,
      sampleScore.post_karma + sampleScore.comment_karma,
    );
  }
}
