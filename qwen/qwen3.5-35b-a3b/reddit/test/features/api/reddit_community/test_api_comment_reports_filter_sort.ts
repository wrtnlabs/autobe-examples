import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunity";
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
import { generate_random_reddit_community_member_subscriptions_create } from "../../../generate/generate_random_reddit_community_member_subscriptions_create";
import { prepare_random_reddit_community_comment } from "../../../prepare/prepare_random_reddit_community_comment";
import { prepare_random_reddit_community_comment_report } from "../../../prepare/prepare_random_reddit_community_comment_report";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";
import { prepare_random_reddit_community_post_file } from "../../../prepare/prepare_random_reddit_community_post_file";
import { prepare_random_reddit_community_subscription } from "../../../prepare/prepare_random_reddit_community_subscription";

export async function test_api_comment_reports_filter_sort(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin joins to manage community and reports
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IRedditCommunityAdmin.IJoin,
  });
  typia.assert(adminAuthorized);
  // Admin retrieves communities to get community ID
  const communities =
    await api.functional.redditCommunity.admin.communities.index(
      adminConnection,
      {
        body: {
          name: undefined,
          sort: "name_asc",
          page: 1,
          limit: 10,
          subscriber_count_min: undefined,
        } satisfies IRedditCommunityCommunity.IRequest,
      },
    );
  typia.assert(communities);
  if (communities.data.length === 0) {
    throw new Error("No communities found for test setup");
  }
  const communityId = communities.data[0].id;
  // 2. Member A (comment author) joins and creates post/comment
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuthorized = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberAAuthorized);
  const memberA = memberAAuthorized;
  // Member A subscribes to community
  await api.functional.redditCommunity.member.subscriptions.create(
    memberAConnection,
    {
      body: {
        reddit_community_communities_id: communityId,
      } satisfies IRedditCommunitySubscription.ICreate,
    },
  );
  // Member A creates post
  const post = await api.functional.redditCommunity.member.posts.create(
    memberAConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text",
        reddit_community_community_id: communityId,
        text_content: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // Member A creates comment
  const comment =
    await api.functional.redditCommunity.member.posts.comments.create(
      memberAConnection,
      {
        postId: post.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
          redditCommunityCommentId: undefined,
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(comment);
  // 3. Member B submits first report (will be approved)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuthorized = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberBAuthorized);
  await api.functional.redditCommunity.member.subscriptions.create(
    memberBConnection,
    {
      body: {
        reddit_community_communities_id: communityId,
      } satisfies IRedditCommunitySubscription.ICreate,
    },
  );
  const report1 =
    await api.functional.redditCommunity.member.posts.comments.reports.create(
      memberBConnection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          reason: RandomGenerator.paragraph({ sentences: 4 }),
        } satisfies IRedditCommunityCommentReport.ICreate,
      },
    );
  typia.assert(report1);
  // 4. Member C submits second report (will be dismissed)
  const memberCConnection: api.IConnection = { host: connection.host };
  const memberCAuthorized = await authorize_member_join(memberCConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberCAuthorized);
  await api.functional.redditCommunity.member.subscriptions.create(
    memberCConnection,
    {
      body: {
        reddit_community_communities_id: communityId,
      } satisfies IRedditCommunitySubscription.ICreate,
    },
  );
  const report2 =
    await api.functional.redditCommunity.member.posts.comments.reports.create(
      memberCConnection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          reason: RandomGenerator.paragraph({ sentences: 4 }),
        } satisfies IRedditCommunityCommentReport.ICreate,
      },
    );
  typia.assert(report2);
  // 5. Admin approves report1 (changes to approved status)
  await api.functional.redditCommunity.admin.reports.approve(adminConnection, {
    reportId: report1.id,
  });
  // 6. Admin dismisses report2 (changes to dismissed status)
  await api.functional.redditCommunity.admin.reports.dismiss(adminConnection, {
    reportId: report2.id,
    body: {
      resolution_notes: "False report - content is fine",
    } satisfies IRedditCommunityReport.IDismissRequest,
  });
  // 7. Member D submits third report (remains pending)
  const memberDConnection: api.IConnection = { host: connection.host };
  const memberDAuthorized = await authorize_member_join(memberDConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberDAuthorized);
  await api.functional.redditCommunity.member.subscriptions.create(
    memberDConnection,
    {
      body: {
        reddit_community_communities_id: communityId,
      } satisfies IRedditCommunitySubscription.ICreate,
    },
  );
  const report3 =
    await api.functional.redditCommunity.member.posts.comments.reports.create(
      memberDConnection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          reason: RandomGenerator.paragraph({ sentences: 4 }),
        } satisfies IRedditCommunityCommentReport.ICreate,
      },
    );
  typia.assert(report3);
  // 8. Member A logs in again to test report filtering
  const memberAConnection2: api.IConnection = { host: connection.host };
  const memberALoggedIn = await authorize_member_login(memberAConnection2, {
    body: {
      email: memberA.email,
      password: memberAAuthorized.token.refresh,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.ILogin,
  });
  typia.assert(memberALoggedIn);
  // 9. Test filtering by status_id: "0" (pending) - should return only report3
  const pendingReports =
    await api.functional.redditCommunity.member.posts.comments.reports.index(
      memberAConnection2,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          status_id: "0",
          reporter_id: undefined,
          created_after: undefined,
          created_before: undefined,
          page: 1,
          limit: 10,
          cursor: undefined,
          sort: "created_at",
        } satisfies IRedditCommunityReport.IRequest,
      },
    );
  typia.assert(pendingReports);
  TestValidator.equals(
    "pending reports count",
    pendingReports.pagination.records,
    1,
  );
  if (pendingReports.data.length > 0) {
    TestValidator.equals(
      "pending status_id",
      pendingReports.data[0].status_id,
      "0",
    );
  }
  // 10. Test filtering by status_id: "1" (approved) - should return report1
  const approvedReports =
    await api.functional.redditCommunity.member.posts.comments.reports.index(
      memberAConnection2,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          status_id: "1",
          reporter_id: undefined,
          created_after: undefined,
          created_before: undefined,
          page: 1,
          limit: 10,
          cursor: undefined,
          sort: "created_at",
        } satisfies IRedditCommunityReport.IRequest,
      },
    );
  typia.assert(approvedReports);
  TestValidator.equals(
    "approved reports count",
    approvedReports.pagination.records,
    1,
  );
  if (approvedReports.data.length > 0) {
    TestValidator.equals(
      "approved status_id",
      approvedReports.data[0].status_id,
      "1",
    );
  }
  // 11. Test filtering by status_id: "2" (dismissed) - should return report2
  const dismissedReports =
    await api.functional.redditCommunity.member.posts.comments.reports.index(
      memberAConnection2,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          status_id: "2",
          reporter_id: undefined,
          created_after: undefined,
          created_before: undefined,
          page: 1,
          limit: 10,
          cursor: undefined,
          sort: "created_at",
        } satisfies IRedditCommunityReport.IRequest,
      },
    );
  typia.assert(dismissedReports);
  TestValidator.equals(
    "dismissed reports count",
    dismissedReports.pagination.records,
    1,
  );
  if (dismissedReports.data.length > 0) {
    TestValidator.equals(
      "dismissed status_id",
      dismissedReports.data[0].status_id,
      "2",
    );
  }
  // 12. Test sorting by status_id (pending first)
  const statusSortedReports =
    await api.functional.redditCommunity.member.posts.comments.reports.index(
      memberAConnection2,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          status_id: undefined,
          reporter_id: undefined,
          created_after: undefined,
          created_before: undefined,
          page: 1,
          limit: 10,
          cursor: undefined,
          sort: "status_id",
        } satisfies IRedditCommunityReport.IRequest,
      },
    );
  typia.assert(statusSortedReports);
  TestValidator.equals(
    "all reports count",
    statusSortedReports.pagination.records,
    3,
  );
  // 13. Test sorting by reporter_id
  const reporterSortedReports =
    await api.functional.redditCommunity.member.posts.comments.reports.index(
      memberAConnection2,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          status_id: undefined,
          reporter_id: undefined,
          created_after: undefined,
          created_before: undefined,
          page: 1,
          limit: 10,
          cursor: undefined,
          sort: "reporter_id",
        } satisfies IRedditCommunityReport.IRequest,
      },
    );
  typia.assert(reporterSortedReports);
  TestValidator.equals(
    "reports by reporter count",
    reporterSortedReports.pagination.records,
    3,
  );
}