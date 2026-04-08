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

export async function test_api_comment_reports_list_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - join and get community list
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
      display_name: "Test Admin",
    },
  });
  typia.assert(admin);
  // Get existing community
  const communityList =
    await api.functional.redditCommunity.admin.communities.index(
      adminConnection,
      {
        body: { limit: 1 },
      },
    );
  typia.assert(communityList);
  if (communityList.data.length === 0) {
    throw new Error("No communities found");
  }
  const communityId = communityList.data[0].id;
  // 2. Member A setup - join and subscribe
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: "memberA@test.com",
      password: "1234",
      username: "MemberA",
      href: "http://test.com/register",
      referrer: "http://test.com/",
    },
  });
  typia.assert(memberA);
  // Member A subscribes to community
  await api.functional.redditCommunity.member.subscriptions.create(
    memberAConnection,
    {
      body: {
        reddit_community_communities_id: communityId,
      },
    },
  );
  // 3. Member A creates a post
  const post = await api.functional.redditCommunity.member.posts.create(
    memberAConnection,
    {
      body: {
        title: typia.random<string & tags.MaxLength<1000>>(),
        post_type: "text" as const,
        reddit_community_community_id: communityId,
        text_content: typia.random<string & tags.MaxLength<10000>>(),
      },
    },
  );
  typia.assert(post);
  // 4. Member A creates a comment on the post
  const comment =
    await api.functional.redditCommunity.member.posts.comments.create(
      memberAConnection,
      {
        postId: post.id,
        body: {
          content: typia.random<
            string & tags.MinLength<1> & tags.MaxLength<10000>
          >(),
        },
      },
    );
  typia.assert(comment);
  // 5. Member B setup - join, subscribe, and submit first report
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: "memberB@test.com",
      password: "1234",
      username: "MemberB",
      href: "http://test.com/register",
      referrer: "http://test.com/",
    },
  });
  typia.assert(memberB);
  await api.functional.redditCommunity.member.subscriptions.create(
    memberBConnection,
    {
      body: {
        reddit_community_communities_id: communityId,
      },
    },
  );
  const report1 =
    await api.functional.redditCommunity.member.posts.comments.reports.create(
      memberBConnection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          reason: "Spam content",
        },
      },
    );
  typia.assert(report1);
  // 6. Member C setup - join, subscribe, and submit second report
  const memberCConnection: api.IConnection = { host: connection.host };
  const memberC = await authorize_member_join(memberCConnection, {
    body: {
      email: "memberC@test.com",
      password: "1234",
      username: "MemberC",
      href: "http://test.com/register",
      referrer: "http://test.com/",
    },
  });
  typia.assert(memberC);
  await api.functional.redditCommunity.member.subscriptions.create(
    memberCConnection,
    {
      body: {
        reddit_community_communities_id: communityId,
      },
    },
  );
  const report2 =
    await api.functional.redditCommunity.member.posts.comments.reports.create(
      memberCConnection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          reason: "Inappropriate content",
        },
      },
    );
  typia.assert(report2);
  // 7. Member A authenticates and lists reports
  const memberAConnectionList: api.IConnection = { host: connection.host };
  await authorize_member_login(memberAConnectionList, {
    body: {
      email: "memberA@test.com",
      password: "1234",
      href: "http://test.com/comments",
      referrer: "http://test.com/posts",
    },
  });
  const reports =
    await api.functional.redditCommunity.member.posts.comments.reports.index(
      memberAConnectionList,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          limit: 20,
          sort: "created_at",
        },
      },
    );
  typia.assert(reports);
  // 8. Validation
  TestValidator.equals("response status", reports.pagination.current, 1);
  TestValidator.equals("response limit", reports.pagination.limit, 20);
  TestValidator.equals("response records", reports.pagination.records, 2);
  TestValidator.equals("response pages", reports.pagination.pages, 1);
  TestValidator.equals("data count", reports.data.length, 2);
  const firstReport = reports.data[0];
  const secondReport = reports.data[1];
  // Verify reports sorted by created_at descending (newest first)
  TestValidator.predicate("reports sorted by created_at desc", () => {
    return (
      new Date(firstReport.created_at) >= new Date(secondReport.created_at)
    );
  });
  // Verify report structure
  TestValidator.equals(
    "first report reporter",
    firstReport.reporter.username,
    "MemberB",
  );
  TestValidator.equals(
    "second report reporter",
    secondReport.reporter.username,
    "MemberC",
  );
  TestValidator.equals(
    "first report reason",
    firstReport.reason,
    "Spam content",
  );
  TestValidator.equals(
    "second report reason",
    secondReport.reason,
    "Inappropriate content",
  );
  TestValidator.equals(
    "first report status_id",
    firstReport.status_id,
    "00000000-0000-0000-0000-000000000000",
  );
  TestValidator.equals(
    "second report status_id",
    secondReport.status_id,
    "00000000-0000-0000-0000-000000000000",
  );
  TestValidator.equals(
    "report community",
    firstReport.community.id,
    communityId,
  );
  TestValidator.equals(
    "report community",
    secondReport.community.id,
    communityId,
  );
  TestValidator.equals(
    "target comment",
    firstReport.targetComment?.id,
    comment.id,
  );
  TestValidator.equals(
    "target comment",
    secondReport.targetComment?.id,
    comment.id,
  );
  TestValidator.equals("target post", firstReport.targetPost, null);
  TestValidator.equals("target post", secondReport.targetPost, null);
  TestValidator.predicate(
    "deleted_at is null",
    () => firstReport.deleted_at === null && secondReport.deleted_at === null,
  );
}
