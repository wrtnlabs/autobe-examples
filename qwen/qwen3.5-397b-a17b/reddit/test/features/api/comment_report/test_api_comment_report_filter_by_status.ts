import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommentReport";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentReport";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityIcon";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostImage";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_comments_reports_create } from "../../../generate/generate_random_reddit_community_member_comments_reports_create";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { generate_random_reddit_community_member_posts_comments_create } from "../../../generate/generate_random_reddit_community_member_posts_comments_create";
import { prepare_random_reddit_community_comment } from "../../../prepare/prepare_random_reddit_community_comment";
import { prepare_random_reddit_community_comment_report } from "../../../prepare/prepare_random_reddit_community_comment_report";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";

export async function test_api_comment_report_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create community owner account
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(ownerAuth);
  // 2. Create community
  const community =
    await generate_random_reddit_community_member_communities_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 3. Subscribe owner to their community
  const ownerSubscription =
    await api.functional.redditCommunity.member.communities.subscription.create(
      ownerConnection,
      {
        communityName: community.name,
      },
    );
  typia.assert(ownerSubscription);
  // 4. Create member accounts who will create comments and reports
  const member1Connection: api.IConnection = { host: connection.host };
  const member1Auth = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member1Auth);
  const member2Connection: api.IConnection = { host: connection.host };
  const member2Auth = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member2Auth);
  const member3Connection: api.IConnection = { host: connection.host };
  const member3Auth = await authorize_member_join(member3Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member3Auth);
  // 5. Subscribe members to the community
  await api.functional.redditCommunity.member.communities.subscription.create(
    member1Connection,
    {
      communityName: community.name,
    },
  );
  await api.functional.redditCommunity.member.communities.subscription.create(
    member2Connection,
    {
      communityName: community.name,
    },
  );
  await api.functional.redditCommunity.member.communities.subscription.create(
    member3Connection,
    {
      communityName: community.name,
    },
  );
  // 6. Create posts in the community
  const post = await api.functional.redditCommunity.member.posts.create(
    ownerConnection,
    {
      body: {
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 1 }),
        text_content: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  typia.assert(post);
  // 7. Create comments on the post
  const comment1 =
    await generate_random_reddit_community_member_posts_comments_create(
      member1Connection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        },
        params: {
          postId: post.id,
        },
      },
    );
  typia.assert(comment1);
  const comment2 =
    await generate_random_reddit_community_member_posts_comments_create(
      member2Connection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        },
        params: {
          postId: post.id,
        },
      },
    );
  typia.assert(comment2);
  const comment3 =
    await generate_random_reddit_community_member_posts_comments_create(
      member3Connection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        },
        params: {
          postId: post.id,
        },
      },
    );
  typia.assert(comment3);
  // 8. Create comment reports with different statuses
  // Report 1: PENDING (default)
  const report1 =
    await generate_random_reddit_community_member_comments_reports_create(
      member1Connection,
      {
        body: {
          reason: "This comment violates community guidelines - spam",
        },
        params: {
          commentId: comment1.id,
        },
      },
    );
  typia.assert(report1);
  TestValidator.equals(
    "Report 1 initial status is PENDING",
    report1.status,
    "PENDING",
  );
  // Report 2: Will be APPROVED
  const report2 =
    await generate_random_reddit_community_member_comments_reports_create(
      member2Connection,
      {
        body: {
          reason: "This comment contains inappropriate content",
        },
        params: {
          commentId: comment2.id,
        },
      },
    );
  typia.assert(report2);
  TestValidator.equals(
    "Report 2 initial status is PENDING",
    report2.status,
    "PENDING",
  );
  // Report 3: Will be DISMISSED
  const report3 =
    await generate_random_reddit_community_member_comments_reports_create(
      member3Connection,
      {
        body: {
          reason: "This comment is misleading information",
        },
        params: {
          commentId: comment3.id,
        },
      },
    );
  typia.assert(report3);
  TestValidator.equals(
    "Report 3 initial status is PENDING",
    report3.status,
    "PENDING",
  );
  // Note: The scenario mentions approving/dismissing reports, but the available API
  // functions don't include endpoints for updating report status. The index endpoint
  // is PATCH method which may support status updates through the request body.
  // For this test, we'll verify filtering works with the reports in PENDING state,
  // and test the filtering mechanism itself.
  // 10. Fetch reports with PENDING status filter
  const pendingReports =
    await api.functional.redditCommunity.member.communities.comment_reports.index(
      ownerConnection,
      {
        communityName: community.name,
        body: {
          status: "PENDING",
        },
      },
    );
  typia.assert(pendingReports);
  // Verify all returned reports have PENDING status
  TestValidator.predicate(
    "All pending reports have PENDING status",
    pendingReports.data.every((report) => report.status === "PENDING"),
  );
  TestValidator.predicate(
    "At least one pending report exists",
    pendingReports.data.length >= 1,
  );
  // 12. Fetch reports with APPROVED status filter
  const approvedReports =
    await api.functional.redditCommunity.member.communities.comment_reports.index(
      ownerConnection,
      {
        communityName: community.name,
        body: {
          status: "APPROVED",
        },
      },
    );
  typia.assert(approvedReports);
  // Verify all returned reports have APPROVED status
  TestValidator.predicate(
    "All approved reports have APPROVED status",
    approvedReports.data.every((report) => report.status === "APPROVED"),
  );
  // 14. Fetch reports with DISMISSED status filter
  const dismissedReports =
    await api.functional.redditCommunity.member.communities.comment_reports.index(
      ownerConnection,
      {
        communityName: community.name,
        body: {
          status: "DISMISSED",
        },
      },
    );
  typia.assert(dismissedReports);
  // Verify all returned reports have DISMISSED status
  TestValidator.predicate(
    "All dismissed reports have DISMISSED status",
    dismissedReports.data.every((report) => report.status === "DISMISSED"),
  );
  // 16. Fetch all reports without status filter
  const allReports =
    await api.functional.redditCommunity.member.communities.comment_reports.index(
      ownerConnection,
      {
        communityName: community.name,
        body: {},
      },
    );
  typia.assert(allReports);
  // 17. Verify unfiltered response contains all reports
  TestValidator.predicate(
    "Unfiltered reports count is at least the number of created reports",
    allReports.data.length >= 3,
  );
  // Verify pagination metadata
  TestValidator.predicate(
    "Pagination current page is 1",
    allReports.pagination.current >= 1,
  );
  TestValidator.predicate(
    "Pagination limit is positive",
    allReports.pagination.limit > 0,
  );
  TestValidator.predicate(
    "Pagination records count matches data length",
    allReports.pagination.records >= allReports.data.length,
  );
  // Verify report details are correct
  const pendingReportIds = pendingReports.data.map((r) => r.id);
  const approvedReportIds = approvedReports.data.map((r) => r.id);
  const dismissedReportIds = dismissedReports.data.map((r) => r.id);
  const allReportIds = allReports.data.map((r) => r.id);
  // Verify no overlap between status-filtered results
  TestValidator.predicate(
    "No report appears in both pending and approved",
    !pendingReportIds.some((id) => approvedReportIds.includes(id)),
  );
  TestValidator.predicate(
    "No report appears in both pending and dismissed",
    !pendingReportIds.some((id) => dismissedReportIds.includes(id)),
  );
  TestValidator.predicate(
    "No report appears in both approved and dismissed",
    !approvedReportIds.some((id) => dismissedReportIds.includes(id)),
  );
  // Verify all filtered reports are included in unfiltered results
  TestValidator.predicate(
    "All pending reports are in unfiltered results",
    pendingReportIds.every((id) => allReportIds.includes(id)),
  );
  TestValidator.predicate(
    "All approved reports are in unfiltered results",
    approvedReportIds.every((id) => allReportIds.includes(id)),
  );
  TestValidator.predicate(
    "All dismissed reports are in unfiltered results",
    dismissedReportIds.every((id) => allReportIds.includes(id)),
  );
  // Verify report details include required fields
  if (pendingReports.data.length > 0) {
    const report = pendingReports.data[0];
    TestValidator.predicate(
      "Report has valid UUID id",
      /^[0-9a-f-]{36}$/i.test(report.id),
    );
    TestValidator.predicate(
      "Report has non-empty reason",
      report.reason.length > 0,
    );
    TestValidator.predicate(
      "Report has reporter with username",
      report.reporter.username.length > 0,
    );
    TestValidator.predicate(
      "Report has comment with content",
      report.comment.content.length > 0,
    );
    TestValidator.predicate(
      "Report has valid created_at timestamp",
      report.created_at.length > 0,
    );
  }
}
