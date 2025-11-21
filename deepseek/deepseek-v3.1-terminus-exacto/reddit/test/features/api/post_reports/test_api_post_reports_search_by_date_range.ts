import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostReport";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostReport";

/**
 * Test date range filtering for post reports to support moderation analytics
 * and historical reporting. Creates member accounts and posts, generates
 * reports at different timestamps, authenticates as moderator, and searches for
 * reports within specific date ranges to validate filtering functionality.
 */
export async function test_api_post_reports_search_by_date_range(
  connection: api.IConnection,
) {
  // Create first member account for post creation
  const member1Email = typia.random<string & tags.Format<"email">>();
  const member1 = await api.functional.auth.member.join(connection, {
    body: {
      email: member1Email,
      password: "password123",
      display_name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member1);

  // Create a test post with a valid community ID (using a random UUID as no community creation API exists)
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 5 }),
        post_type: "text",
        status: "published",
        community_platform_community_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // Create additional member accounts for reporting
  const reporterEmails = ArrayUtil.repeat(3, () =>
    typia.random<string & tags.Format<"email">>(),
  );
  const reporters: ICommunityPlatformMember.IAuthorized[] = [];

  for (const email of reporterEmails) {
    // Use fresh connection for each member creation to avoid token conflicts
    const freshConn: api.IConnection = { ...connection, headers: {} };
    const reporter = await api.functional.auth.member.join(freshConn, {
      body: {
        email,
        password: "password123",
        display_name: RandomGenerator.name(),
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
    typia.assert(reporter);
    reporters.push(reporter);
  }

  // Generate reports at different timestamps
  const reportReasons = [
    "spam",
    "harassment",
    "inappropriate content",
    "misinformation",
  ] as const;
  const reports: ICommunityPlatformPostReport[] = [];

  // Create reports with different timestamps using different reporters
  for (let i = 0; i < reporters.length; i++) {
    // Switch to reporter account using fresh connection
    const reporterConn: api.IConnection = { ...connection, headers: {} };
    await api.functional.auth.member.login(reporterConn, {
      body: {
        email: reporterEmails[i],
        password: "password123",
        href: "https://example.com/login",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ILogin,
    });

    const report =
      await api.functional.communityPlatform.member.posts.reports.create(
        reporterConn,
        {
          postId: post.id,
          body: {
            actor_type: "member",
            report_reason: RandomGenerator.pick(reportReasons),
            report_details: RandomGenerator.paragraph({ sentences: 3 }),
          } satisfies ICommunityPlatformPostReport.ICreate,
        },
      );
    typia.assert(report);
    reports.push(report);
  }

  // Create moderator account and authenticate
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorConn: api.IConnection = { ...connection, headers: {} };
  const moderator = await api.functional.auth.moderator.join(moderatorConn, {
    body: {
      email: moderatorEmail,
      display_name: RandomGenerator.name(),
      moderator_level: "community",
      is_active: true,
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator);

  // Authenticate as moderator
  await api.functional.auth.moderator.login(moderatorConn, {
    body: {
      email: moderatorEmail,
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // Test 1: Search without date range (should return all reports)
  const allReports =
    await api.functional.communityPlatform.moderator.posts.reports.index(
      moderatorConn,
      {
        postId: post.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformPostReport.IRequest,
      },
    );
  typia.assert(allReports);
  TestValidator.equals(
    "all reports should be returned",
    allReports.data.length,
    reports.length,
  );

  // Test 2: Search with specific date range covering all reports
  const earliestReport = reports.reduce((earliest, current) =>
    current.created_at < earliest.created_at ? current : earliest,
  );
  const latestReport = reports.reduce((latest, current) =>
    current.created_at > latest.created_at ? current : latest,
  );

  const dateRangeReports =
    await api.functional.communityPlatform.moderator.posts.reports.index(
      moderatorConn,
      {
        postId: post.id,
        body: {
          page: 1,
          limit: 10,
          created_at_start: earliestReport.created_at,
          created_at_end: latestReport.created_at,
        } satisfies ICommunityPlatformPostReport.IRequest,
      },
    );
  typia.assert(dateRangeReports);
  TestValidator.equals(
    "date range should return all reports",
    dateRangeReports.data.length,
    reports.length,
  );

  // Test 3: Search with status filter combined with date range
  const filteredReports =
    await api.functional.communityPlatform.moderator.posts.reports.index(
      moderatorConn,
      {
        postId: post.id,
        body: {
          page: 1,
          limit: 10,
          status: "pending",
          created_at_start: earliestReport.created_at,
          created_at_end: latestReport.created_at,
        } satisfies ICommunityPlatformPostReport.IRequest,
      },
    );
  typia.assert(filteredReports);
  TestValidator.predicate(
    "filtered reports should have pending status",
    filteredReports.data.every((report) => report.status === "pending"),
  );

  // Test 4: Validate pagination with date filtering
  const paginatedReports =
    await api.functional.communityPlatform.moderator.posts.reports.index(
      moderatorConn,
      {
        postId: post.id,
        body: {
          page: 1,
          limit: 2,
          created_at_start: earliestReport.created_at,
          created_at_end: latestReport.created_at,
        } satisfies ICommunityPlatformPostReport.IRequest,
      },
    );
  typia.assert(paginatedReports);
  TestValidator.equals(
    "pagination limit should be respected",
    paginatedReports.data.length,
    2,
  );
  TestValidator.equals(
    "pagination should show correct page info",
    paginatedReports.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination should show correct limit",
    paginatedReports.pagination.limit,
    2,
  );

  // Test 5: Search with actor type filter
  const actorFilteredReports =
    await api.functional.communityPlatform.moderator.posts.reports.index(
      moderatorConn,
      {
        postId: post.id,
        body: {
          page: 1,
          limit: 10,
          actor_type: "member",
          created_at_start: earliestReport.created_at,
          created_at_end: latestReport.created_at,
        } satisfies ICommunityPlatformPostReport.IRequest,
      },
    );
  typia.assert(actorFilteredReports);
  TestValidator.predicate(
    "actor filtered reports should have member type",
    actorFilteredReports.data.every((report) => report.actor_type === "member"),
  );
}
