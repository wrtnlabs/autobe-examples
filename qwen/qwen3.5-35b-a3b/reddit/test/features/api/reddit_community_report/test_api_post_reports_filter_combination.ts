import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityReport";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostFile";
import type { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { generate_random_reddit_community_member_posts_reports_create } from "../../../generate/generate_random_reddit_community_member_posts_reports_create";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";
import { prepare_random_reddit_community_post_file } from "../../../prepare/prepare_random_reddit_community_post_file";
import { prepare_random_reddit_community_report } from "../../../prepare/prepare_random_reddit_community_report";

/**
 * Test the filtering capability of the reports listing endpoint.
 *
 * Validates the complete filtering functionality of the Reddit Community report listing endpoint.
 * Moderators should be able to filter reports by status_id, reporter_id, and date range to focus
 * their review on specific report states.
 *
 * Special attention is given to verifying that:
 * - Status filter returns only reports matching specified status
 * - Reporter filter returns only reports from specified reporter
 * - Date range filter returns reports within specified time window
 * - Combined filters work correctly
 *
 * 1. Register two members (Member A and Member B)
 * 2. Member A creates a post in a community
 * 3. Both members create reports on the same post
 * 4. Test status_id filter (pending only)
 * 5. Test reporter_id filter (filter by Member B)
 * 6. Test created_after date range filter
 * 7. Test combined filters (status_id + reporter_id + created_after)
 *
 * Validation points:
 * - Query parameters are correctly applied
 * - Each filter returns the expected subset of reports
 * - Pagination works correctly with filtered results
 * - Response data matches the applied filters exactly
 */
export async function test_api_post_reports_filter_combination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register Member A
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberA);
  const memberAId = memberA.id;
  // 2. Register Member B
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberB);
  const memberBId = memberB.id;
  // 3. Member A creates a post
  const memberAPostConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(memberAPostConnection, {
    body: {
      email: memberA.email,
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const post = await api.functional.redditCommunity.member.posts.create(
    memberAPostConnection,
    {
      body: {
        title: RandomGenerator.name(),
        post_type: "text",
        reddit_community_community_id: typia.random<
          string & tags.Format<"uuid">
        >(),
        text_content: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(post);
  const postId = post.id;
  // 4. Member B creates a report on the post
  const memberBReportConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(memberBReportConnection, {
    body: {
      email: memberB.email,
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const reportB =
    await api.functional.redditCommunity.member.posts.reports.create(
      memberBReportConnection,
      {
        postId,
        body: {
          reason: "Inappropriate content",
        },
      },
    );
  typia.assert(reportB);
  const reportBId = reportB.id;
  const reportBCreatedAt = reportB.created_at;
  // 5. Member A creates a report on the same post
  const memberAReportConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(memberAReportConnection, {
    body: {
      email: memberA.email,
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const reportA =
    await api.functional.redditCommunity.member.posts.reports.create(
      memberAReportConnection,
      {
        postId,
        body: {
          reason: "Spam",
        },
      },
    );
  typia.assert(reportA);
  const reportAId = reportA.id;
  const reportACreatedAt = reportA.created_at;
  // Wait a moment to ensure distinct timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 6. Get all reports (no filter) - using Member A as moderator
  const allReportsConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(allReportsConnection, {
    body: {
      email: memberA.email,
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const allReports =
    await api.functional.redditCommunity.member.posts.reports.index(
      allReportsConnection,
      {
        postId,
        body: { page: 1, limit: 10 },
      },
    );
  typia.assert(allReports);
  TestValidator.equals("total reports", allReports.pagination.records, 2);
  TestValidator.equals("report count in data", allReports.data.length, 2);
  // 7. Filter by status_id=0 (pending only)
  const statusFilterConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(statusFilterConnection, {
    body: {
      email: memberA.email,
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const statusFiltered =
    await api.functional.redditCommunity.member.posts.reports.index(
      statusFilterConnection,
      {
        postId,
        body: { status_id: "0", page: 1, limit: 10 },
      },
    );
  typia.assert(statusFiltered);
  TestValidator.equals(
    "pending reports count",
    statusFiltered.pagination.records,
    2,
  );
  TestValidator.equals(
    "pending reports in data",
    statusFiltered.data.length,
    2,
  );
  // 8. Filter by reporter_id (Member B)
  const reporterFilterConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(reporterFilterConnection, {
    body: {
      email: memberA.email,
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const reporterFiltered =
    await api.functional.redditCommunity.member.posts.reports.index(
      reporterFilterConnection,
      {
        postId,
        body: { reporter_id: memberBId, page: 1, limit: 10 },
      },
    );
  typia.assert(reporterFiltered);
  TestValidator.equals(
    "reports by reporter B count",
    reporterFiltered.pagination.records,
    1,
  );
  TestValidator.equals(
    "reports by reporter B in data",
    reporterFiltered.data.length,
    1,
  );
  // 9. Filter by date range (created_after)
  const dateFilterConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(dateFilterConnection, {
    body: {
      email: memberA.email,
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const dateAfterFilter =
    await api.functional.redditCommunity.member.posts.reports.index(
      dateFilterConnection,
      {
        postId,
        body: {
          created_after: reportACreatedAt,
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(dateAfterFilter);
  TestValidator.equals(
    "reports after date count",
    dateAfterFilter.pagination.records,
    1,
  );
  TestValidator.equals(
    "reports after date in data",
    dateAfterFilter.data.length,
    1,
  );
  TestValidator.equals(
    "report is reportA",
    dateAfterFilter.data[0].id,
    reportAId,
  );
  // 10. Filter by combined criteria
  const combinedFilterConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(combinedFilterConnection, {
    body: {
      email: memberA.email,
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const combinedFiltered =
    await api.functional.redditCommunity.member.posts.reports.index(
      combinedFilterConnection,
      {
        postId,
        body: {
          status_id: "0",
          reporter_id: memberBId,
          created_after: reportBCreatedAt,
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(combinedFiltered);
  TestValidator.equals(
    "combined filter results count",
    combinedFiltered.pagination.records,
    1,
  );
  TestValidator.equals(
    "combined filter in data",
    combinedFiltered.data.length,
    1,
  );
  const combinedReport = combinedFiltered.data[0];
  TestValidator.equals(
    "combined filter report matches",
    combinedReport.id,
    reportBId,
  );
  TestValidator.equals("combined filter status", combinedReport.status_id, "0");
  TestValidator.equals(
    "combined filter reporter",
    combinedReport.reporter.id,
    memberBId,
  );
}
