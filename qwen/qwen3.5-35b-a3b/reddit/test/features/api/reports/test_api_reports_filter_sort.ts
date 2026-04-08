import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformReport";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberSession";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostImage";
import type { IRedditPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostLink";
import type { IRedditPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostText";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import type { IRedditPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformSubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { generate_random_reddit_platform_member_reports_create } from "../../../generate/generate_random_reddit_platform_member_reports_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_report } from "../../../prepare/prepare_random_reddit_platform_report";

/**
 * Test the filtering and sorting capabilities of the reports list.
 *
 * Validates the filtering and sorting features of the Reddit platform reports API.
 * Creates multiple reports with different statuses and timing, then verifies the
 * report list endpoint correctly handles date range filtering, sorting operations,
 * and pagination. This test ensures moderators can effectively query reports
 * using the available filtering and sorting parameters.
 *
 * 1. Set up moderator accounts for testing report management.
 * 2. Create a community and have reporter users subscribe to it.
 * 3. Create posts that will be reported by different users.
 * 4. Submit multiple reports with varying timestamps.
 * 5. Approve one report to create mixed status reports.
 * 6. Test date range filtering with created_at_from and created_at_to.
 * 7. Test sorting by created_at (default), reviewed_at, and status.
 * 8. Test pagination parameters (page, limit) and metadata.
 */
export async function test_api_reports_filter_sort(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(moderatorConnection, {
    body: {
      email: "moderator@test.com",
      password: "password1234",
      username: "moderator1",
      href: "http://localhost/test",
      referrer: "http://localhost/test",
    } satisfies IRedditPlatformMember.IJoin,
  });
  // 2. Create community
  const community =
    await api.functional.redditPlatform.member.communities.create(
      moderatorConnection,
      {
        body: {
          name: "test_community_" + RandomGenerator.alphaNumeric(6),
          description: "Test community for reports",
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Reporter users subscribe to community
  const reporter1Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(reporter1Connection, {
    body: {
      email: "reporter1@test.com",
      password: "password1234",
      username: "reporter1",
      href: "http://localhost/test",
      referrer: "http://localhost/test",
    } satisfies IRedditPlatformMember.IJoin,
  });
  await api.functional.redditPlatform.member.communities.subscribe(
    reporter1Connection,
    { communityName: community.name },
  );
  const reporter2Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(reporter2Connection, {
    body: {
      email: "reporter2@test.com",
      password: "password1234",
      username: "reporter2",
      href: "http://localhost/test",
      referrer: "http://localhost/test",
    } satisfies IRedditPlatformMember.IJoin,
  });
  await api.functional.redditPlatform.member.communities.subscribe(
    reporter2Connection,
    { communityName: community.name },
  );
  // 4. Create posts for reporting
  const post1 = await api.functional.redditPlatform.member.posts.create(
    reporter1Connection,
    {
      body: {
        community_id: community.id,
        title: "Test Post 1",
        post_type: "text" as const,
        text_content: "This is test post content 1",
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post1);
  const post2 = await api.functional.redditPlatform.member.posts.create(
    reporter1Connection,
    {
      body: {
        community_id: community.id,
        title: "Test Post 2",
        post_type: "text" as const,
        text_content: "This is test post content 2",
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post2);
  const post3 = await api.functional.redditPlatform.member.posts.create(
    reporter2Connection,
    {
      body: {
        community_id: community.id,
        title: "Test Post 3",
        post_type: "text" as const,
        text_content: "This is test post content 3",
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post3);
  // 5. Create reports
  const report1 = await api.functional.redditPlatform.member.reports.create(
    reporter1Connection,
    {
      body: {
        target_id: post1.id,
        target_type: "post" as const,
        reason: "Spam content",
      } satisfies IRedditPlatformReport.ICreate,
    },
  );
  typia.assert(report1);
  const report2 = await api.functional.redditPlatform.member.reports.create(
    reporter1Connection,
    {
      body: {
        target_id: post2.id,
        target_type: "post" as const,
        reason: "Inappropriate content",
      } satisfies IRedditPlatformReport.ICreate,
    },
  );
  typia.assert(report2);
  const report3 = await api.functional.redditPlatform.member.reports.create(
    reporter2Connection,
    {
      body: {
        target_id: post3.id,
        target_type: "post" as const,
        reason: "Violates community guidelines",
      } satisfies IRedditPlatformReport.ICreate,
    },
  );
  typia.assert(report3);
  // Wait to ensure different timestamps
  await new Promise((resolve) => setTimeout(resolve, 1000));
  // 6. Approve report1 to create different status reports
  const approvedReport =
    await api.functional.redditPlatform.member.reports.approve(
      moderatorConnection,
      { reportId: report1.id },
    );
  typia.assert(approvedReport);
  // 7. Test filters and sorting
  // Test 1: All reports (no filter)
  const allReportsResponse =
    await api.functional.redditPlatform.member.reports.index(
      moderatorConnection,
      {
        body: {} satisfies IRedditPlatformReport.IRequest,
      },
    );
  typia.assert(allReportsResponse);
  TestValidator.equals(
    "all reports count",
    allReportsResponse.pagination.records,
    3,
  );
  TestValidator.equals(
    "all reports data count",
    allReportsResponse.data.length,
    3,
  );
  // Test 2: Date range filter - created_at_from (only reports after this time)
  const report1Date = new Date(report1.created_at).getTime();
  const waitTime = 500;
  const dateFrom = new Date(report1Date + waitTime).toISOString();
  const dateFromResponse =
    await api.functional.redditPlatform.member.reports.index(
      moderatorConnection,
      {
        body: {
          created_at_from: dateFrom,
        } satisfies IRedditPlatformReport.IRequest,
      },
    );
  typia.assert(dateFromResponse);
  TestValidator.equals(
    "date from count",
    dateFromResponse.pagination.records,
    2,
  );
  // Verify all returned reports are after the date
  for (const report of dateFromResponse.data) {
    const reportTime = new Date(report.created_at).getTime();
    TestValidator.predicate(
      "report created_at after filter",
      reportTime >= new Date(dateFrom).getTime(),
    );
  }
  // Test 3: Date range filter - created_at_to (only reports before this time)
  const report3Date = new Date(report3.created_at).getTime();
  const dateTo = new Date(report3Date - waitTime).toISOString();
  const dateToResponse =
    await api.functional.redditPlatform.member.reports.index(
      moderatorConnection,
      {
        body: {
          created_at_to: dateTo,
        } satisfies IRedditPlatformReport.IRequest,
      },
    );
  typia.assert(dateToResponse);
  TestValidator.equals("date to count", dateToResponse.pagination.records, 1);
  // Verify all returned reports are before the date
  for (const report of dateToResponse.data) {
    const reportTime = new Date(report.created_at).getTime();
    TestValidator.predicate(
      "report created_at before filter",
      reportTime <= new Date(dateTo).getTime(),
    );
  }
  // Test 4: Sort by created_at (default, most recent first)
  const sortByCreatedResponse =
    await api.functional.redditPlatform.member.reports.index(
      moderatorConnection,
      {
        body: { sort: "created_at" } satisfies IRedditPlatformReport.IRequest,
      },
    );
  typia.assert(sortByCreatedResponse);
  if (sortByCreatedResponse.data.length > 1) {
    const firstCreatedAt = new Date(
      sortByCreatedResponse.data[0].created_at,
    ).getTime();
    const secondCreatedAt = new Date(
      sortByCreatedResponse.data[1].created_at,
    ).getTime();
    TestValidator.predicate(
      "sorted by created_at DESC",
      firstCreatedAt >= secondCreatedAt,
    );
  }
  // Test 5: Sort by status (alphabetical by status string)
  const sortByStatusResponse =
    await api.functional.redditPlatform.member.reports.index(
      moderatorConnection,
      {
        body: { sort: "status" } satisfies IRedditPlatformReport.IRequest,
      },
    );
  typia.assert(sortByStatusResponse);
  if (sortByStatusResponse.data.length > 1) {
    const statuses = sortByStatusResponse.data.map((r) => r.status);
    const sortedStatuses = [...statuses].sort();
    TestValidator.equals(
      "sorted by status alphabetically",
      statuses,
      sortedStatuses,
    );
  }
  // Test 6: Sort by reviewed_at (reports with reviews first)
  const sortByReviewedResponse =
    await api.functional.redditPlatform.member.reports.index(
      moderatorConnection,
      {
        body: { sort: "reviewed_at" } satisfies IRedditPlatformReport.IRequest,
      },
    );
  typia.assert(sortByReviewedResponse);
  // Verify that approved reports (with reviewed_at) come before pending ones (null)
  const hasReviewed = sortByReviewedResponse.data.some(
    (r) => r.reviewed_at !== null,
  );
  const hasPending = sortByReviewedResponse.data.some(
    (r) => r.reviewed_at === null,
  );
  if (hasReviewed && hasPending) {
    // Check that first non-null reviewed_at comes before null values
    const firstNotNullIndex = sortByReviewedResponse.data.findIndex(
      (r) => r.reviewed_at !== null,
    );
    const firstNullIndex = sortByReviewedResponse.data.findIndex(
      (r) => r.reviewed_at === null,
    );
    if (firstNotNullIndex !== -1 && firstNullIndex !== -1) {
      TestValidator.predicate(
        "reviewed_at sort: non-null before null",
        firstNotNullIndex < firstNullIndex,
      );
    }
  }
  // Test 7: Pagination - page 1 with limit 2
  const paginationResponse =
    await api.functional.redditPlatform.member.reports.index(
      moderatorConnection,
      {
        body: {
          page: 1,
          limit: 2,
        } satisfies IRedditPlatformReport.IRequest,
      },
    );
  typia.assert(paginationResponse);
  TestValidator.equals(
    "pagination current",
    paginationResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    paginationResponse.pagination.limit,
    2,
  );
  TestValidator.equals(
    "pagination records",
    paginationResponse.pagination.records,
    3,
  );
  TestValidator.equals(
    "pagination pages",
    paginationResponse.pagination.pages,
    2,
  );
  TestValidator.equals(
    "pagination data count",
    paginationResponse.data.length,
    2,
  );
  // Test 8: Pagination - last page
  const lastPageResponse =
    await api.functional.redditPlatform.member.reports.index(
      moderatorConnection,
      {
        body: {
          page: 2,
          limit: 2,
        } satisfies IRedditPlatformReport.IRequest,
      },
    );
  typia.assert(lastPageResponse);
  TestValidator.equals(
    "last page current",
    lastPageResponse.pagination.current,
    2,
  );
  TestValidator.equals(
    "last page records",
    lastPageResponse.pagination.records,
    3,
  );
  TestValidator.equals("last page data count", lastPageResponse.data.length, 1);
  // Test 9: Pagination - larger limit
  const largeLimitResponse =
    await api.functional.redditPlatform.member.reports.index(
      moderatorConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IRedditPlatformReport.IRequest,
      },
    );
  typia.assert(largeLimitResponse);
  TestValidator.equals(
    "large limit records",
    largeLimitResponse.pagination.records,
    3,
  );
  TestValidator.equals(
    "large limit data count",
    largeLimitResponse.data.length,
    3,
  );
  TestValidator.equals(
    "large limit pages",
    largeLimitResponse.pagination.pages,
    1,
  );
}
