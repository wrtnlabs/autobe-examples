import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityReport";
import type { IRedditCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunity";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";

/**
 * Test filtering community reports by date range using from_date and to_date
 * parameters.
 *
 * This test validates that moderators can filter content violation reports
 * based on submission timestamps. It creates multiple reports at different
 * times, then uses date range filters to ensure only reports within the
 * specified time window are returned.
 *
 * Test flow:
 *
 * 1. Create moderator account and authenticate
 * 2. Create a community for testing
 * 3. Create member account and authenticate
 * 4. Create multiple posts to be reported
 * 5. Create reports at different timestamps with delays between them
 * 6. Query reports with date range filters
 * 7. Validate that only reports within the date range are returned
 */
export async function test_api_community_reports_date_range_filtering(
  connection: api.IConnection,
) {
  // 1. Create and authenticate moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = typia.random<string & tags.MinLength<8>>();
  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        nickname: RandomGenerator.name(),
        ip: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // 2. Create community
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          display_title: RandomGenerator.name(3),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          rules: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
          banner_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 3. Create and authenticate member for reporting
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(10),
        email: memberEmail,
        password: typia.random<string & tags.MinLength<8>>(),
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        avatar_url: typia.random<string & tags.Format<"uri">>(),
        show_online_status: false,
        show_subscribed_communities: false,
        show_activity_feed: true,
        ip: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityGuest.ICreate,
    });
  typia.assert(member);

  // 4. Create multiple posts to report
  const posts: IRedditCommunityPost[] = await ArrayUtil.asyncRepeat(
    5,
    async () => {
      const post: IRedditCommunityPost =
        await api.functional.redditCommunity.member.posts.create(connection, {
          body: {
            community_id: community.id,
            title: RandomGenerator.paragraph({ sentences: 1 }),
            post_type: "text" as const,
            body: RandomGenerator.content({ paragraphs: 2 }),
            url: null,
            image_url: null,
          } satisfies IRedditCommunityPost.ICreate,
        });
      typia.assert(post);
      return post;
    },
  );

  // 5. Create reports at different timestamps
  // Create first batch of reports
  const earlyReports: IRedditCommunityReport[] = await ArrayUtil.asyncRepeat(
    2,
    async (index) => {
      const report: IRedditCommunityReport =
        await api.functional.redditCommunity.member.reports.create(connection, {
          body: {
            content_type: "post" as const,
            target_content_id: posts[index].id,
            reddit_community_community_id: community.id,
            category: "spam" as const,
            description: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IRedditCommunityReport.ICreate,
        });
      typia.assert(report);
      return report;
    },
  );

  // Record timestamp after early reports
  const midTimestamp = new Date().toISOString();

  // Wait to ensure timestamp difference
  await new Promise((resolve) => setTimeout(resolve, 200));

  // Create middle batch of reports
  const middleReports: IRedditCommunityReport[] = await ArrayUtil.asyncRepeat(
    2,
    async (index) => {
      const report: IRedditCommunityReport =
        await api.functional.redditCommunity.member.reports.create(connection, {
          body: {
            content_type: "post" as const,
            target_content_id: posts[index + 2].id,
            reddit_community_community_id: community.id,
            category: "harassment" as const,
            description: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IRedditCommunityReport.ICreate,
        });
      typia.assert(report);
      return report;
    },
  );

  // Record timestamp after middle reports
  const lateTimestamp = new Date().toISOString();

  // Wait to ensure timestamp difference
  await new Promise((resolve) => setTimeout(resolve, 200));

  // Create late batch of reports
  const lateReports: IRedditCommunityReport[] = await ArrayUtil.asyncRepeat(
    1,
    async () => {
      const report: IRedditCommunityReport =
        await api.functional.redditCommunity.member.reports.create(connection, {
          body: {
            content_type: "post" as const,
            target_content_id: posts[4].id,
            reddit_community_community_id: community.id,
            category: "misinformation" as const,
            description: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IRedditCommunityReport.ICreate,
        });
      typia.assert(report);
      return report;
    },
  );

  // 6. Switch to moderator to query reports
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ILogin,
  });

  // 7. Test date range filtering - get reports from middle period only
  const filteredReports: IPageIRedditCommunityReport.ISummary =
    await api.functional.redditCommunity.moderator.communities.reports.index(
      connection,
      {
        communityName: community.name,
        body: {
          page: 1,
          limit: 50,
          from_date: midTimestamp,
          to_date: lateTimestamp,
        } satisfies IRedditCommunityReport.IRequest,
      },
    );
  typia.assert(filteredReports);

  // Validate pagination metadata
  TestValidator.predicate(
    "filtered reports should have valid pagination",
    filteredReports.pagination.current >= 0 &&
      filteredReports.pagination.limit > 0,
  );

  // Validate that returned reports are within date range
  for (const report of filteredReports.data) {
    const reportDate = new Date(report.created_at);
    const fromDate = new Date(midTimestamp);
    const toDate = new Date(lateTimestamp);

    TestValidator.predicate(
      "report should be after from_date",
      reportDate >= fromDate,
    );

    TestValidator.predicate(
      "report should be before to_date",
      reportDate <= toDate,
    );
  }

  // Test filtering with only from_date
  const reportsFromMid: IPageIRedditCommunityReport.ISummary =
    await api.functional.redditCommunity.moderator.communities.reports.index(
      connection,
      {
        communityName: community.name,
        body: {
          page: 1,
          limit: 50,
          from_date: midTimestamp,
        } satisfies IRedditCommunityReport.IRequest,
      },
    );
  typia.assert(reportsFromMid);

  TestValidator.predicate(
    "reports with only from_date should include middle and late reports",
    reportsFromMid.data.length >= middleReports.length,
  );

  // Test filtering with only to_date
  const reportsUntilMid: IPageIRedditCommunityReport.ISummary =
    await api.functional.redditCommunity.moderator.communities.reports.index(
      connection,
      {
        communityName: community.name,
        body: {
          page: 1,
          limit: 50,
          to_date: midTimestamp,
        } satisfies IRedditCommunityReport.IRequest,
      },
    );
  typia.assert(reportsUntilMid);

  TestValidator.predicate(
    "reports with only to_date should include early reports",
    reportsUntilMid.data.length >= earlyReports.length,
  );

  // Test getting all reports without date filters
  const allReports: IPageIRedditCommunityReport.ISummary =
    await api.functional.redditCommunity.moderator.communities.reports.index(
      connection,
      {
        communityName: community.name,
        body: {
          page: 1,
          limit: 50,
        } satisfies IRedditCommunityReport.IRequest,
      },
    );
  typia.assert(allReports);

  TestValidator.predicate(
    "all reports without date filter should return all created reports",
    allReports.data.length === 5,
  );
}
