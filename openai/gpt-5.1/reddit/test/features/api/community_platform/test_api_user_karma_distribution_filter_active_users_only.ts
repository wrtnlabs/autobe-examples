import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformVotingKarmaStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVotingKarmaStatistics";

/**
 * Validate that the user karma distribution analytics endpoint respects the
 * "include only active users" filter.
 *
 * Business context: Platform administrators need to compare overall karma
 * distribution against the distribution limited to active users only. This test
 * ensures that when the include_only_active_users option is enabled in
 * IUserKarmaDistributionRequest, the resulting distribution is logically a
 * subset of the unconstrained distribution (with respect to user counts and
 * karma ranges) and that the response configuration correctly reflects the
 * filter.
 *
 * Steps:
 *
 * 1. Register and authenticate a platform administrator via POST
 *    /auth/platformAdmin/join, using realistic join payload fields.
 * 2. Invoke the user karma distribution endpoint with include_only_active_users:
 *    true.
 * 3. Invoke the same endpoint again with an empty body (no filters), to get an
 *    unconstrained distribution snapshot.
 * 4. Compare the two distributions to ensure the active-only distribution is a
 *    logical subset of the unconstrained distribution.
 */
export async function test_api_user_karma_distribution_filter_active_users_only(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform administrator
  const adminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Fetch distribution including only active users
  const activeOnlyRequest = {
    include_only_active_users: true,
  } satisfies ICommunityPlatformVotingKarmaStatistics.IUserKarmaDistributionRequest;

  const activeOnlyDistribution: ICommunityPlatformVotingKarmaStatistics.IUserKarmaDistribution =
    await api.functional.communityPlatform.platformAdmin.votingKarma.statistics.userKarmaDistribution.index(
      connection,
      {
        body: activeOnlyRequest,
      },
    );
  typia.assert(activeOnlyDistribution);

  // 3. Fetch unconstrained distribution (no filters)
  const unconstrainedRequest = {
    // no filters -> backend defaults
  } satisfies ICommunityPlatformVotingKarmaStatistics.IUserKarmaDistributionRequest;

  const unconstrainedDistribution: ICommunityPlatformVotingKarmaStatistics.IUserKarmaDistribution =
    await api.functional.communityPlatform.platformAdmin.votingKarma.statistics.userKarmaDistribution.index(
      connection,
      {
        body: unconstrainedRequest,
      },
    );
  typia.assert(unconstrainedDistribution);

  // 4. Business validations comparing active-only vs unconstrained
  // 4-1. Total user count: active-only must be <= unconstrained
  TestValidator.predicate(
    "active-only totalUserCount must not exceed unconstrained totalUserCount",
    activeOnlyDistribution.totalUserCount <=
      unconstrainedDistribution.totalUserCount,
  );

  // 4-2. Karma range must be within or equal to unconstrained range
  TestValidator.predicate(
    "active-only minKarma is not less than unconstrained minKarma",
    activeOnlyDistribution.minKarma >= unconstrainedDistribution.minKarma,
  );
  TestValidator.predicate(
    "active-only maxKarma is not greater than unconstrained maxKarma",
    activeOnlyDistribution.maxKarma <= unconstrainedDistribution.maxKarma,
  );

  // 4-3. Buckets comparison when both have buckets
  if (
    activeOnlyDistribution.buckets.length > 0 &&
    unconstrainedDistribution.buckets.length > 0
  ) {
    TestValidator.predicate(
      "active-only bucket count must not exceed unconstrained bucket count",
      activeOnlyDistribution.buckets.length <=
        unconstrainedDistribution.buckets.length,
    );

    const activeUserCountSum = activeOnlyDistribution.buckets.reduce(
      (sum, bucket) => sum + bucket.userCount,
      0,
    );
    const unconstrainedUserCountSum = unconstrainedDistribution.buckets.reduce(
      (sum, bucket) => sum + bucket.userCount,
      0,
    );

    TestValidator.predicate(
      "sum of active-only bucket userCount must not exceed unconstrained",
      activeUserCountSum <= unconstrainedUserCountSum,
    );
  }

  // 4-4. Configuration echo checks (if present)
  if (activeOnlyDistribution.configuration) {
    TestValidator.predicate(
      "configuration.includeOnlyActiveUsers should be true for active-only request",
      activeOnlyDistribution.configuration.includeOnlyActiveUsers === true,
    );
  }

  if (unconstrainedDistribution.configuration) {
    // For unconstrained, we only assert that if includeOnlyActiveUsers exists,
    // it should not be true (i.e., either false or omitted/null), to avoid
    // over-constraining server behavior.
    const includeOnlyActive =
      unconstrainedDistribution.configuration.includeOnlyActiveUsers;
    TestValidator.predicate(
      "unconstrained configuration should not indicate includeOnlyActiveUsers true",
      includeOnlyActive === false || includeOnlyActive === undefined,
    );
  }
}
