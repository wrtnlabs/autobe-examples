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

export async function test_api_comment_reports_pagination(
  connection: api.IConnection,
): Promise<void> {
  // ============================================
  // Setup Phase
  // ============================================
  // 1.1 Admin joins and retrieves community ID
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      display_name: RandomGenerator.name(),
    } satisfies IRedditCommunityAdmin.IJoin,
  });
  const communities =
    await api.functional.redditCommunity.admin.communities.index(
      adminConnection,
      {
        body: {
          limit: 1,
          page: 1,
        },
      },
    );
  typia.assert(communities);
  TestValidator.equals(
    "community list has items",
    communities.data.length,
    0,
  );
  const communityId = communities.data[0].id;
  // 1.2 Member A joins, subscribes, creates post and comment
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAJoinResponse = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(1),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies IRedditCommunityMember.IJoin,
  });
  // Subscribe to community
  await api.functional.redditCommunity.member.subscriptions.create(
    memberAConnection,
    {
      body: {
        reddit_community_communities_id: communityId,
      },
    },
  );
  // Create post
  const post = await api.functional.redditCommunity.member.posts.create(
    memberAConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text",
        reddit_community_community_id: communityId,
        text_content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // Create comment to be reported
  const comment =
    await api.functional.redditCommunity.member.posts.comments.create(
      memberAConnection,
      {
        postId: post.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(comment);
  // 1.3 Members B through I join, subscribe, and submit reports
  const reporterEmails: string[] = [];
  for (const char of ["B", "C", "D", "E", "F", "G", "H", "I"]) {
    const memberConnection: api.IConnection = { host: connection.host };
    const joinResponse = await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "1234",
        username: RandomGenerator.name(1),
        href: "https://example.com/join",
        referrer: "https://example.com",
      } satisfies IRedditCommunityMember.IJoin,
    });
    reporterEmails.push(joinResponse.email);
    // Subscribe to community
    await api.functional.redditCommunity.member.subscriptions.create(
      memberConnection,
      {
        body: {
          reddit_community_communities_id: communityId,
        },
      },
    );
    // Submit report
    await api.functional.redditCommunity.member.posts.comments.reports.create(
      memberConnection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          reason: `Report ${char}: Testing pagination functionality`,
        } satisfies IRedditCommunityCommentReport.ICreate,
      },
    );
  }
  // ============================================
  // Test Case 1: Default Pagination
  // ============================================
  const defaultPaginationResult =
    await api.functional.redditCommunity.member.posts.comments.reports.index(
      memberAConnection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          limit: 20,
          page: 1,
        },
      },
    );
  typia.assert(defaultPaginationResult);
  TestValidator.equals(
    "default pagination current page",
    defaultPaginationResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "default pagination limit",
    defaultPaginationResult.pagination.limit,
    20,
  );
  TestValidator.equals(
    "default pagination records",
    defaultPaginationResult.pagination.records,
    8,
  );
  TestValidator.equals(
    "default pagination pages",
    defaultPaginationResult.pagination.pages,
    1,
  );
  TestValidator.equals(
    "default pagination data array length",
    defaultPaginationResult.data.length,
    8,
  );
  // ============================================
  // Test Case 2: Limited Page Size
  // ============================================
  const limitedPageResult =
    await api.functional.redditCommunity.member.posts.comments.reports.index(
      memberAConnection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          limit: 3,
          page: 1,
        },
      },
    );
  typia.assert(limitedPageResult);
  TestValidator.equals(
    "limited page current page",
    limitedPageResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "limited page limit",
    limitedPageResult.pagination.limit,
    3,
  );
  TestValidator.equals(
    "limited page records",
    limitedPageResult.pagination.records,
    8,
  );
  TestValidator.equals(
    "limited page pages",
    limitedPageResult.pagination.pages,
    3,
  );
  TestValidator.equals(
    "limited page 1 data array length",
    limitedPageResult.data.length,
    3,
  );
  // ============================================
  // Test Case 3: Second Page
  // ============================================
  const secondPageResult =
    await api.functional.redditCommunity.member.posts.comments.reports.index(
      memberAConnection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          limit: 3,
          page: 2,
        },
      },
    );
  typia.assert(secondPageResult);
  TestValidator.equals(
    "second page current page",
    secondPageResult.pagination.current,
    2,
  );
  TestValidator.equals(
    "second page limit",
    secondPageResult.pagination.limit,
    3,
  );
  TestValidator.equals(
    "second page records",
    secondPageResult.pagination.records,
    8,
  );
  TestValidator.equals(
    "second page pages",
    secondPageResult.pagination.pages,
    3,
  );
  TestValidator.equals(
    "second page data array length",
    secondPageResult.data.length,
    3,
  );
  // ============================================
  // Test Case 4: Last Page
  // ============================================
  const lastPageResult =
    await api.functional.redditCommunity.member.posts.comments.reports.index(
      memberAConnection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          limit: 3,
          page: 3,
        },
      },
    );
  typia.assert(lastPageResult);
  TestValidator.equals(
    "last page current page",
    lastPageResult.pagination.current,
    3,
  );
  TestValidator.equals("last page limit", lastPageResult.pagination.limit, 3);
  TestValidator.equals(
    "last page records",
    lastPageResult.pagination.records,
    8,
  );
  TestValidator.equals("last page pages", lastPageResult.pagination.pages, 3);
  TestValidator.equals(
    "last page data array length",
    lastPageResult.data.length,
    2,
  );
  // ============================================
  // Edge Case: No Reports
  // ============================================
  const newComment =
    await api.functional.redditCommunity.member.posts.comments.create(
      memberAConnection,
      {
        postId: post.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(newComment);
  const noReportsResult =
    await api.functional.redditCommunity.member.posts.comments.reports.index(
      memberAConnection,
      {
        postId: post.id,
        commentId: newComment.id,
        body: {
          limit: 20,
          page: 1,
        },
      },
    );
  typia.assert(noReportsResult);
  TestValidator.equals(
    "no reports pagination records",
    noReportsResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "no reports pagination pages",
    noReportsResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "no reports data array is empty",
    noReportsResult.data.length,
    0,
  );
}