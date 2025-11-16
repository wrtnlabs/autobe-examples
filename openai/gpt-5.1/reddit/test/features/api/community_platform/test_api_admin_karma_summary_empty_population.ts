import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformKarmaSummaryStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaSummaryStatistics";

export async function test_api_admin_karma_summary_empty_population(
  connection: api.IConnection,
) {
  // 1. Register an adminUser and obtain an authorized admin context
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminAuthorized);

  // 2. Without creating any memberUser karma activity, call the summary endpoint
  const summary: ICommunityPlatformKarmaSummaryStatistics =
    await api.functional.communityPlatform.adminUser.statistics.karma.summary.index(
      connection,
    );

  // Type-level contract validation
  typia.assert<ICommunityPlatformKarmaSummaryStatistics>(summary);

  // 3. Assert count and sum fields are zero for empty population
  TestValidator.equals(
    "active user count should be 0 when there is no karma data",
    summary.active_user_count,
    0,
  );

  TestValidator.equals(
    "total post karma sum should be 0 when there is no karma data",
    summary.total_post_karma_sum,
    0,
  );

  TestValidator.equals(
    "total comment karma sum should be 0 when there is no karma data",
    summary.total_comment_karma_sum,
    0,
  );

  TestValidator.equals(
    "total karma sum should be 0 when there is no karma data",
    summary.total_karma_sum,
    0,
  );

  // 4. Assert scalar statistics are null in empty-population scenario
  TestValidator.equals(
    "average_total_karma should be null when there is no active user",
    summary.average_total_karma,
    null,
  );

  TestValidator.equals(
    "max_total_karma should be null when there is no active user",
    summary.max_total_karma,
    null,
  );

  TestValidator.equals(
    "min_total_karma should be null when there is no active user",
    summary.min_total_karma,
    null,
  );

  TestValidator.equals(
    "median_total_karma should be null when there is no active user",
    summary.median_total_karma,
    null,
  );

  TestValidator.equals(
    "p90_total_karma should be null when there is no active user",
    summary.p90_total_karma,
    null,
  );

  TestValidator.equals(
    "p99_total_karma should be null when there is no active user",
    summary.p99_total_karma,
    null,
  );

  // 5. Sanity predicate that sums are consistent with active_user_count
  await TestValidator.predicate(
    "karma sums should be zero exactly when there are no active users",
    async () =>
      summary.active_user_count === 0 &&
      summary.total_post_karma_sum === 0 &&
      summary.total_comment_karma_sum === 0 &&
      summary.total_karma_sum === 0,
  );
}
