import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { ICommunityPlatformVoteKarmaImpact } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVoteKarmaImpact";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformVoteKarmaImpact } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformVoteKarmaImpact";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_vote_karma_impacts_moderator_vote_pattern_investigation(
  connection: api.IConnection,
): Promise<void> {
  // Create moderator connection
  const moderatorConnection: api.IConnection = { host: connection.host };
  // Register and authenticate as moderator
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  typia.assert(moderator);
  // Test 1: Basic karma impacts query for recent activity (last 30 days)
  const thirtyDaysAgo = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const now = new Date().toISOString();
  const recentActivity =
    await api.functional.communityPlatform.moderator.vote_karma_impacts.index(
      moderatorConnection,
      {
        body: {
          start_time: thirtyDaysAgo,
          end_time: now,
          granularity: "day",
        } satisfies ICommunityPlatformVoteKarmaImpact.IRequest,
      },
    );
  typia.assert(recentActivity);
  // Test 2: Investigate concentrated voting patterns (last 24 hours)
  const twentyFourHoursAgo = new Date(
    Date.now() - 24 * 60 * 60 * 1000,
  ).toISOString();
  const concentratedPatterns =
    await api.functional.communityPlatform.moderator.vote_karma_impacts.index(
      moderatorConnection,
      {
        body: {
          start_time: twentyFourHoursAgo,
          end_time: now,
          granularity: "hour",
        } satisfies ICommunityPlatformVoteKarmaImpact.IRequest,
      },
    );
  typia.assert(concentratedPatterns);
  // Test 3: Pagination test for large result sets
  const paginatedResults =
    await api.functional.communityPlatform.moderator.vote_karma_impacts.index(
      moderatorConnection,
      {
        body: {
          start_time: thirtyDaysAgo,
          end_time: now,
          page: 1,
          limit: 25,
        } satisfies ICommunityPlatformVoteKarmaImpact.IRequest,
      },
    );
  typia.assert(paginatedResults);
  // Validate pagination structure for moderator dashboard
  TestValidator.equals(
    "pagination current page",
    paginatedResults.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    paginatedResults.pagination.limit,
    25,
  );
  TestValidator.predicate(
    "pagination records count valid",
    paginatedResults.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count valid",
    paginatedResults.pagination.pages >= 0,
  );
  // Test 4: Weekly aggregation for trend analysis
  const threeMonthsAgo = new Date(
    Date.now() - 90 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const trendAnalysis =
    await api.functional.communityPlatform.moderator.vote_karma_impacts.index(
      moderatorConnection,
      {
        body: {
          start_time: threeMonthsAgo,
          end_time: now,
          granularity: "week",
        } satisfies ICommunityPlatformVoteKarmaImpact.IRequest,
      },
    );
  typia.assert(trendAnalysis);
  // Validate karma impact data structure for investigation purposes
  if (paginatedResults.data.length > 0) {
    const sampleImpact = paginatedResults.data[0];
    // Validate essential fields for voting pattern investigation
    TestValidator.predicate(
      "karma impact has valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        sampleImpact.id,
      ),
    );
    TestValidator.predicate(
      "karma delta is valid vote value",
      sampleImpact.karma_delta === 1 || sampleImpact.karma_delta === -1,
    );
    TestValidator.predicate(
      "created at is valid ISO date",
      !isNaN(new Date(sampleImpact.created_at).getTime()),
    );
    TestValidator.predicate(
      "user has valid profile structure",
      sampleImpact.user.id.length > 0 && sampleImpact.user.username.length > 0,
    );
    // Business logic validation: karma should reflect user's overall score
    TestValidator.predicate(
      "user karma score is integer",
      Number.isInteger(sampleImpact.user.karma),
    );
  }
  // Test 5: Empty query to verify system handles no filters correctly
  const defaultQuery =
    await api.functional.communityPlatform.moderator.vote_karma_impacts.index(
      moderatorConnection,
      {
        body: {} satisfies ICommunityPlatformVoteKarmaImpact.IRequest,
      },
    );
  typia.assert(defaultQuery);
  // The system should return valid results even with empty filters
  TestValidator.predicate(
    "default query returns valid pagination",
    defaultQuery.pagination.records >= 0,
  );
  TestValidator.predicate(
    "default query has valid data structure",
    Array.isArray(defaultQuery.data),
  );
}
