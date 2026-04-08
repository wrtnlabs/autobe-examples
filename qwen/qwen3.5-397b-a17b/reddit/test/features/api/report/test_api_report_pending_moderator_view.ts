import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityReport";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerator";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostImageContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostImageContent";
import type { IRedditCommunityPostLinkContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostLinkContent";
import type { IRedditCommunityPostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostTextContent";
import type { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { generate_random_reddit_community_member_communities_moderators_create } from "../../../generate/generate_random_reddit_community_member_communities_moderators_create";
import { generate_random_reddit_community_member_posts_comments_create } from "../../../generate/generate_random_reddit_community_member_posts_comments_create";
import { generate_random_reddit_community_member_reports_create } from "../../../generate/generate_random_reddit_community_member_reports_create";
import { generate_random_reddit_community_posts_create } from "../../../generate/generate_random_reddit_community_posts_create";
import { prepare_random_reddit_community_comment } from "../../../prepare/prepare_random_reddit_community_comment";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_moderator } from "../../../prepare/prepare_random_reddit_community_moderator";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";
import { prepare_random_reddit_community_report } from "../../../prepare/prepare_random_reddit_community_report";

/**
 * Test moderator retrieval of pending community reports.
 *
 * Validates the complete report moderation workflow including member authentication, community creation, moderator assignment, content creation (posts and comments), report filing, and pending report retrieval. Ensures that moderators can access the pending reports queue for their assigned community.
 *
 * The test creates multiple reports of different types (post reports and comment reports) to verify that the endpoint correctly returns all pending reports regardless of the reported content type. All reports are created with 'pending' status by default.
 *
 * 1. Member registers account with email, password, and username.
 * 2. Member creates a new community with name, description, and icon.
 * 3. Member is assigned as moderator of the created community.
 * 4. Member creates a text post in the community.
 * 5. Member creates a comment on the post.
 * 6. Member files a report against the post with violation reason.
 * 7. Member files a report against the comment with violation reason.
 * 8. Moderator calls pending reports endpoint with community ID.
 * 9. Validates response contains IPageIRedditCommunityReport.ISummary with correct structure.
 * 10. Validates all reports have status 'pending' and correct reportType values.
 * 11. Validates pagination metadata includes current page, limit, total records, and total pages.
 * 12. Validates reporter information is included in each report summary.
 * 13. Validates target content references (post or comment) are valid and include required fields.
 * 14. Validates reports are sorted by created_at in descending order (newest first).
 */
export async function test_api_report_pending_moderator_view(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create community
  const community =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Assign member as moderator of the community
  const moderatorAssignment =
    await generate_random_reddit_community_member_communities_moderators_create(
      memberConnection,
      {
        body: {
          memberId: memberAuth.id,
          role: "moderator",
        } satisfies IRedditCommunityModerator.ICreate,
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(moderatorAssignment);
  // 4. Create a post in the community
  const post = await generate_random_reddit_community_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "text",
        community_id: community.id,
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Create a comment on the post
  const comment =
    await generate_random_reddit_community_member_posts_comments_create(
      memberConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditCommunityComment.ICreate,
        params: {
          postId: post.id,
        },
      },
    );
  typia.assert(comment);
  // 6. File a report against the post
  const postReport =
    await generate_random_reddit_community_member_reports_create(
      memberConnection,
      {
        body: {
          report_type: "post",
          target_id: post.id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditCommunityReport.ICreate,
      },
    );
  typia.assert(postReport);
  // 7. File a report against the comment
  const commentReport =
    await generate_random_reddit_community_member_reports_create(
      memberConnection,
      {
        body: {
          report_type: "comment",
          target_id: comment.id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditCommunityReport.ICreate,
      },
    );
  typia.assert(commentReport);
  // 8. Retrieve pending reports for the community
  const pendingReports =
    await api.functional.redditCommunity.member.communities.reports.pending.index(
      memberConnection,
      {
        communityId: community.id,
        body: {
          status: "pending",
          sort: "created_at",
          order: "desc",
          page: 1,
          limit: 20,
        } satisfies IRedditCommunityReport.IRequest,
      },
    );
  typia.assert(pendingReports);
  // 9. Validate pagination metadata
  TestValidator.equals("current page", pendingReports.pagination.current, 1);
  TestValidator.equals("limit", pendingReports.pagination.limit, 20);
  TestValidator.predicate(
    "records count at least 2",
    pendingReports.pagination.records >= 2,
  );
  TestValidator.predicate(
    "pages count at least 1",
    pendingReports.pagination.pages >= 1,
  );
  // 10. Validate reports array contains expected reports
  TestValidator.predicate(
    "at least 2 reports returned",
    pendingReports.data.length >= 2,
  );
  // 11. Validate all reports have pending status
  for (const report of pendingReports.data) {
    TestValidator.equals("status is pending", report.status, "pending");
    TestValidator.predicate(
      "resolved_at is null for pending",
      report.resolvedAt === null,
    );
  }
  // 12. Validate reports are sorted by created_at descending (newest first)
  if (pendingReports.data.length >= 2) {
    const firstReportCreatedAt = new Date(
      pendingReports.data[0].createdAt,
    ).getTime();
    const secondReportCreatedAt = new Date(
      pendingReports.data[1].createdAt,
    ).getTime();
    TestValidator.predicate(
      "reports sorted by created_at desc",
      firstReportCreatedAt >= secondReportCreatedAt,
    );
  }
  // 13. Validate at least one post report and one comment report exist
  const postReports = pendingReports.data.filter(
    (r) => r.reportType === "post",
  );
  const commentReports = pendingReports.data.filter(
    (r) => r.reportType === "comment",
  );
  TestValidator.predicate("at least one post report", postReports.length >= 1);
  TestValidator.predicate(
    "at least one comment report",
    commentReports.length >= 1,
  );
  // 14. Validate reporter information matches the member who filed reports
  for (const report of pendingReports.data) {
    TestValidator.equals(
      "reporter id matches",
      report.reporter.id,
      memberAuth.id,
    );
    TestValidator.equals(
      "reporter username matches",
      report.reporter.username,
      memberAuth.username,
    );
  }
  // 15. Validate target content for post reports references the created post
  for (const report of postReports) {
    const target = report.target as IRedditCommunityPost.ISummary;
    TestValidator.equals("post report target id", target.id, post.id);
  }
  // 16. Validate target content for comment reports references the created comment
  for (const report of commentReports) {
    const target = report.target as IRedditCommunityComment.ISummary;
    TestValidator.equals("comment report target id", target.id, comment.id);
  }
}
