import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";
import type { ICommunityPlatformReportStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportStatistics";

/**
 * Validate that a community moderator can retrieve basic report statistics over
 * existing reports.
 *
 * Business flow:
 *
 * 1. A member user registers (join) and implicitly authenticates.
 * 2. A community moderator registers and implicitly authenticates.
 * 3. As the member user, create at least one moderation report.
 * 4. Switch authentication context back to the community moderator.
 * 5. Call the report statistics endpoint with a time window covering “now”.
 * 6. Assert that statistics show at least one report and have meaningful
 *    aggregations (status/targetType/reasonCategory/timeSeries).
 */
export async function test_api_moderation_report_statistics_basic_by_community_moderator(
  connection: api.IConnection,
) {
  // 1. Register a member user (join) - this also authenticates as member
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/signup",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberAuthorized);

  // 2. Register a community moderator (join) - captures credentials for later login
  const moderatorEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const moderatorPassword: string = RandomGenerator.alphaNumeric(12);

  const moderatorJoinBody = {
    username: RandomGenerator.name(1),
    email: moderatorEmail,
    password: moderatorPassword,
    display_name: RandomGenerator.name(2),
    ip: null,
    href: "https://example.com/moderator/signup",
    referrer: "https://example.com/moderator/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert<ICommunityPlatformCommunityModerator.IAuthorized>(
    moderatorAuthorized,
  );

  // 3. (Optional realism) Ensure member login path also works and that
  //    we are in member context when creating the report.
  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: null,
    href: "https://example.com/login",
    referrer: "https://example.com/home",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLoginAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberLoginAuthorized);

  // 4. As the member user, create at least one report.
  //    We rely on typia.random to build a structurally valid ICreate payload.
  const reportCreateBody = typia.random<ICommunityPlatformReport.ICreate>();

  const createdReport: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      {
        body: reportCreateBody,
      },
    );
  typia.assert<ICommunityPlatformReport>(createdReport);

  // 5. Switch authentication context back to the community moderator.
  const moderatorLoginBody = {
    identifier: moderatorJoinBody.email,
    password: moderatorPassword,
    ip: null,
    href: "https://example.com/moderator/login",
    referrer: "https://example.com/moderator/home",
  } satisfies ICommunityPlatformCommunityModerator.ILogin;

  const moderatorLoginAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: moderatorLoginBody,
    });
  typia.assert<ICommunityPlatformCommunityModerator.IAuthorized>(
    moderatorLoginAuthorized,
  );

  // 6. Build a statistics request around the current time.
  const now = new Date();
  const from = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const to = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

  const statsRequestBody = {
    from,
    to,
    // Leave all optional filters undefined to avoid over-restricting
    target_types: undefined,
    reason_category_ids: undefined,
    statuses: undefined,
    community_ids: undefined,
    group_by: undefined,
  } satisfies ICommunityPlatformReportStatistics.IRequest;

  const statistics: ICommunityPlatformReportStatistics =
    await api.functional.communityPlatform.communityModerator.statistics.reports.index(
      connection,
      {
        body: statsRequestBody,
      },
    );
  typia.assert<ICommunityPlatformReportStatistics>(statistics);

  // 7. Business validations

  // totalCount should be at least 1
  TestValidator.predicate(
    "report statistics totalCount should be at least 1",
    statistics.totalCount >= 1,
  );

  // At least one bucket across status/targetType/reasonCategory has count >= 1
  const hasStatusBucket = statistics.countByStatus.some((b) => b.count >= 1);
  const hasTargetTypeBucket = statistics.countByTargetType.some(
    (b) => b.count >= 1,
  );
  const hasReasonCategoryBucket = statistics.countByReasonCategory.some(
    (b) => b.count >= 1,
  );

  TestValidator.predicate(
    "statistics should have at least one non-zero bucket in status/targetType/reasonCategory",
    hasStatusBucket || hasTargetTypeBucket || hasReasonCategoryBucket,
  );

  // timeSeries should contain at least one bucket with count >= 1
  const hasNonZeroTimeBucket = statistics.timeSeries.some(
    (bucket) => bucket.count >= 1,
  );

  TestValidator.predicate(
    "report statistics timeSeries should contain at least one bucket with count >= 1",
    hasNonZeroTimeBucket,
  );
}
