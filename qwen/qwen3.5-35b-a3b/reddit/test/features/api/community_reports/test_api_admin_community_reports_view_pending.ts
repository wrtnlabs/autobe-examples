import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityReport";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentReport";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostFile";
import type { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_posts_comments_create } from "../../../generate/generate_random_reddit_community_member_posts_comments_create";
import { generate_random_reddit_community_member_posts_comments_reports_create } from "../../../generate/generate_random_reddit_community_member_posts_comments_reports_create";
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { generate_random_reddit_community_member_posts_reports_create } from "../../../generate/generate_random_reddit_community_member_posts_reports_create";
import { generate_random_reddit_community_member_subscriptions_create } from "../../../generate/generate_random_reddit_community_member_subscriptions_create";
import { prepare_random_reddit_community_comment } from "../../../prepare/prepare_random_reddit_community_comment";
import { prepare_random_reddit_community_comment_report } from "../../../prepare/prepare_random_reddit_community_comment_report";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";
import { prepare_random_reddit_community_post_file } from "../../../prepare/prepare_random_reddit_community_post_file";
import { prepare_random_reddit_community_report } from "../../../prepare/prepare_random_reddit_community_report";
import { prepare_random_reddit_community_subscription } from "../../../prepare/prepare_random_reddit_community_subscription";

export async function test_api_admin_community_reports_view_pending(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(adminAuth);
  // 2. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      href: "https://example.com/join",
      referrer: "https://example.com",
    },
  });
  typia.assert(memberAuth);
  // 3. Create a community (use random UUID for testing)
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // 4. Subscribe member to community
  await generate_random_reddit_community_member_subscriptions_create(
    memberConnection,
    {
      body: {
        reddit_community_communities_id: communityId,
      },
    },
  );
  // 5. Create a post in the community
  const post = await generate_random_reddit_community_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text" as const,
        reddit_community_community_id: communityId,
        text_content: RandomGenerator.content({ paragraphs: 1 }),
      },
    },
  );
  typia.assert(post);
  // 6. Create a comment on the post
  const comment =
    await generate_random_reddit_community_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(comment);
  // 7. Submit a post report
  const postReport =
    await generate_random_reddit_community_member_posts_reports_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          reason: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 5,
            wordMax: 10,
          }),
        },
      },
    );
  typia.assert(postReport);
  // 8. Submit a comment report
  const commentReport =
    await generate_random_reddit_community_member_posts_comments_reports_create(
      memberConnection,
      {
        params: { postId: post.id, commentId: comment.id },
        body: {
          reason: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 5,
            wordMax: 10,
          }),
        },
      },
    );
  typia.assert(commentReport);
  // 9. Call admin endpoint to view reports
  const response =
    await api.functional.redditCommunity.admin.communities.reports.patchByCommunityid(
      adminConnection,
      {
        communityId,
        body: {},
      },
    );
  typia.assert(response);
  // 10. Verify pagination metadata
  TestValidator.equals("pagination records", response.pagination.records, 2);
  TestValidator.equals("pagination pages", response.pagination.pages, 1);
  TestValidator.equals("pagination current", response.pagination.current, 1);
  TestValidator.equals("pagination limit", response.pagination.limit, 20);
  // 11. Verify data array contains exactly 2 report records
  TestValidator.equals("report count", response.data.length, 2);
  // 12. Verify reports are sorted by created_at descending (newest first)
  TestValidator.predicate(
    "reports sorted by created_at DESC",
    response.data[0].created_at >= response.data[1].created_at,
  );
  // 13. Verify first report has targetPost populated
  const postReportInList = response.data.find((r) => r.targetPost !== null);
  if (postReportInList && postReportInList.targetPost) {
    typia.assert(postReportInList.targetPost);
    TestValidator.equals(
      "targetPost id",
      postReportInList.targetPost.id,
      post.id,
    );
    TestValidator.equals(
      "targetPost title",
      postReportInList.targetPost.title,
      post.title,
    );
    TestValidator.equals(
      "targetPost type",
      postReportInList.targetPost.post_type,
      "text",
    );
    TestValidator.predicate(
      "targetPost text_content truncated max 200 chars",
      (postReportInList.targetPost.text_content?.length ?? 0) <= 200,
    );
  }
  // 14. Verify second report has targetComment populated
  const commentReportInList = response.data.find(
    (r) => r.targetComment !== null,
  );
  if (commentReportInList && commentReportInList.targetComment) {
    typia.assert(commentReportInList.targetComment);
    TestValidator.equals(
      "targetComment id",
      commentReportInList.targetComment.id,
      comment.id,
    );
    TestValidator.predicate(
      "targetComment content exists",
      commentReportInList.targetComment.content.length > 0,
    );
    TestValidator.equals(
      "targetComment is_top_level",
      commentReportInList.targetComment.is_top_level,
      true,
    );
    TestValidator.predicate(
      "targetComment vote_count non-negative",
      commentReportInList.targetComment.vote_count >= 0,
    );
  }
  // 15. Verify reporter object structure
  for (const report of response.data) {
    TestValidator.predicate(
      "reporter id exists",
      report.reporter.id.length > 0,
    );
    TestValidator.predicate(
      "reporter username exists",
      report.reporter.username.length > 0,
    );
    TestValidator.predicate(
      "reporter created_at format",
      /^\d{4}-\d{2}-\d{2}T/.test(report.reporter.created_at),
    );
    TestValidator.predicate(
      "reporter updated_at format",
      /^\d{4}-\d{2}-\d{2}T/.test(report.reporter.updated_at),
    );
  }
  // 16. Verify community object structure
  for (const report of response.data) {
    TestValidator.predicate(
      "community id exists",
      report.community.id.length > 0,
    );
    TestValidator.predicate(
      "community name exists",
      report.community.name.length > 0,
    );
    TestValidator.predicate(
      "community created_at format",
      /^\d{4}-\d{2}-\d{2}T/.test(report.community.created_at),
    );
  }
  // 17. Verify status_id is "pending" (0) for both reports
  for (const report of response.data) {
    TestValidator.equals(
      "report status_id is pending (0)",
      report.status_id,
      "0",
    );
  }
  // 18. Verify created_at timestamps are in ISO 8601 format
  for (const report of response.data) {
    TestValidator.predicate(
      "created_at is ISO 8601 format",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(report.created_at),
    );
  }
  // 19. Verify deleted_at is null for active reports
  for (const report of response.data) {
    TestValidator.equals("report deleted_at is null", report.deleted_at, null);
  }
  // 20. Test filtering by status_id
  const filteredByStatus =
    await api.functional.redditCommunity.admin.communities.reports.patchByCommunityid(
      adminConnection,
      {
        communityId,
        body: { status_id: "0" },
      },
    );
  typia.assert(filteredByStatus);
  TestValidator.equals(
    "filtered reports by status_id",
    filteredByStatus.data.length,
    2,
  );
  // 21. Test filtering by reporter_id
  const filteredByReporter =
    await api.functional.redditCommunity.admin.communities.reports.patchByCommunityid(
      adminConnection,
      {
        communityId,
        body: { reporter_id: memberAuth.id },
      },
    );
  typia.assert(filteredByReporter);
  TestValidator.equals(
    "filtered reports by reporter_id",
    filteredByReporter.data.length,
    2,
  );
  // 22. Test pagination with custom limit
  const paginatedResponse =
    await api.functional.redditCommunity.admin.communities.reports.patchByCommunityid(
      adminConnection,
      {
        communityId,
        body: { page: 1, limit: 100 },
      },
    );
  typia.assert(paginatedResponse);
  TestValidator.equals(
    "paginated limit",
    paginatedResponse.pagination.limit,
    100,
  );
}
