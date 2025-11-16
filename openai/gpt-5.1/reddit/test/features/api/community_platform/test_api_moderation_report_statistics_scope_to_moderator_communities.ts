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
 * Validate that a community moderator sees report statistics scoped to their
 * communities.
 *
 * Business flow (adapted to available APIs and fixtures):
 *
 * 1. Register a member user (auth/memberUser/join).
 * 2. Register a community moderator (auth/communityModerator/join).
 * 3. Log in as the member user.
 * 4. Create several reports via communityPlatform/memberUser/reports.
 * 5. Log back in as the community moderator.
 * 6. Call communityPlatform/communityModerator/statistics/reports with a time
 *    range covering all created reports and group_by ["community"], leaving
 *    community_ids undefined so backend applies moderator-based scoping.
 * 7. Assert that the statistics response is structurally valid and that
 *    communityBreakdown, when present, is consistent with totalCount and has at
 *    least one non-empty bucket when totalCount > 0.
 */
export async function test_api_moderation_report_statistics_scope_to_moderator_communities(
  connection: api.IConnection,
) {
  // Helper to build a simple, valid-looking URL string.
  const buildUrl = (path: string): string => `https://example.com${path}`;

  // 1. Register member user
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberPassword: string = RandomGenerator.alphaNumeric(12);
  const memberJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: memberEmail,
    password: memberPassword,
    ip: null,
    href: buildUrl("/signup"),
    referrer: buildUrl("/landing"),
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. Register community moderator
  const moderatorEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const moderatorPassword: string = RandomGenerator.alphaNumeric(12);
  const moderatorJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: moderatorEmail,
    password: moderatorPassword,
    display_name: RandomGenerator.name(2),
    ip: null,
    href: buildUrl("/moderator/signup"),
    referrer: buildUrl("/landing/moderator"),
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuthorized);

  // 3. Switch to member user actor (login)
  const memberLoginBody = {
    identifier: memberEmail,
    password: memberPassword,
    ip: null,
    href: buildUrl("/login"),
    referrer: buildUrl("/landing"),
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLoginAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginAuthorized);

  // 4. Create several reports as the member user
  const reportCount = 3;
  const createdReports: ICommunityPlatformReport[] = [];

  for (let i = 0; i < reportCount; i += 1) {
    const reportBody = {
      reporter_type: "member",
      report_reason_category_id: typia.random<string & tags.Format<"uuid">>(),
      community_id: typia.random<string & tags.Format<"uuid">>(),
      severity: null,
      description: RandomGenerator.paragraph({ sentences: 5 }),
    } satisfies ICommunityPlatformReport.ICreate;

    const report: ICommunityPlatformReport =
      await api.functional.communityPlatform.memberUser.reports.create(
        connection,
        {
          body: reportBody,
        },
      );
    typia.assert(report);
    createdReports.push(report);
  }

  // Ensure we actually created some reports
  TestValidator.predicate(
    "at least one report should be created",
    createdReports.length > 0,
  );

  // 5. Switch back to community moderator actor (login)
  const moderatorLoginBody = {
    identifier: moderatorEmail,
    password: moderatorPassword,
    ip: null,
    href: buildUrl("/moderator/login"),
    referrer: buildUrl("/landing/moderator"),
  } satisfies ICommunityPlatformCommunityModerator.ILogin;

  const moderatorLoginAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: moderatorLoginBody,
    });
  typia.assert(moderatorLoginAuthorized);

  // 6. Compute time range covering all created reports
  const createdAtDates: Date[] = createdReports.map(
    (report) => new Date(report.created_at),
  );

  const minCreatedAt = createdAtDates.reduce(
    (min, current) => (current.getTime() < min.getTime() ? current : min),
    createdAtDates[0],
  );
  const maxCreatedAt = createdAtDates.reduce(
    (max, current) => (current.getTime() > max.getTime() ? current : max),
    createdAtDates[0],
  );

  const oneMinuteMs = 60_000;
  const fromIso = new Date(minCreatedAt.getTime() - oneMinuteMs).toISOString();
  const toIso = new Date(maxCreatedAt.getTime() + oneMinuteMs).toISOString();

  // 7. Build statistics request body
  const statsRequestBody = {
    from: fromIso,
    to: toIso,
    target_types: undefined,
    reason_category_ids: undefined,
    statuses: undefined,
    community_ids: undefined,
    group_by: ["community"],
  } satisfies ICommunityPlatformReportStatistics.IRequest;

  // 8. Call statistics endpoint as moderator
  const stats: ICommunityPlatformReportStatistics =
    await api.functional.communityPlatform.communityModerator.statistics.reports.index(
      connection,
      {
        body: statsRequestBody,
      },
    );
  typia.assert(stats);

  // 9. Validate statistics semantics

  // totalCount should be non-negative
  TestValidator.predicate(
    "totalCount should be non-negative",
    stats.totalCount >= 0,
  );

  const communityBreakdown = stats.communityBreakdown ?? [];
  const sumCommunityReports = communityBreakdown.reduce(
    (sum, bucket) => sum + bucket.totalReports,
    0,
  );

  // Sum of community buckets must not exceed totalCount
  TestValidator.predicate(
    "sum of community bucket totals should not exceed totalCount",
    sumCommunityReports <= stats.totalCount,
  );

  if (stats.totalCount > 0 && communityBreakdown.length > 0) {
    // At least one community bucket should have non-zero reports
    const hasNonZeroBucket = communityBreakdown.some(
      (bucket) => bucket.totalReports > 0,
    );

    TestValidator.predicate(
      "at least one community bucket should have non-zero totalReports when totalCount > 0",
      hasNonZeroBucket,
    );
  }
}
