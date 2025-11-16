import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserLogin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentAnalytics } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentAnalytics";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommentAnalytics } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommentAnalytics";

export async function test_api_admin_comment_analytics_basic_flow(
  connection: api.IConnection,
) {
  // 1. Create and authenticate a memberUser who will own community, post, and comments
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphaNumeric(8)}@member.test`,
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://client.app/member/join",
    referrer: "https://client.app/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberUser: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberUser);

  // 2. As memberUser, create a community
  const communitySlug = RandomGenerator.alphaNumeric(12);

  const communityCreateBody = {
    slug: communitySlug as string & tags.MinLength<1> & tags.MaxLength<128>,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // 3. Create a membership for the member user in that community
  const membershipCreateBody = {
    role: "member",
    isApproved: true,
    isBanned: false,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const membership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug: community.slug,
        body: membershipCreateBody,
      },
    );
  typia.assert(membership);

  // 4. Create a post in that community
  const postCreateBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);

  // 5. Create at least one comment under that post
  const commentBodies: ICommunityPlatformComment.ICreate[] = ArrayUtil.repeat(
    2,
    () =>
      ({
        content: RandomGenerator.paragraph({ sentences: 2 }),
      }) satisfies ICommunityPlatformComment.ICreate,
  );

  const comments: ICommunityPlatformComment[] = [];
  for (const body of commentBodies) {
    const comment =
      await api.functional.communityPlatform.memberUser.posts.comments.create(
        connection,
        {
          postId: post.id as string & tags.Format<"uuid">,
          body,
        },
      );
    typia.assert(comment);
    comments.push(comment);
  }

  TestValidator.predicate("at least one comment created", comments.length >= 1);

  // 6. Create and authenticate an adminUser
  const adminJoinBody = {
    username: `admin_${RandomGenerator.alphaNumeric(6)}`,
    email: `${RandomGenerator.alphaNumeric(8)}@admin.test`,
    password: RandomGenerator.alphaNumeric(16) as string &
      tags.Format<"password">,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 7. Call admin comment analytics endpoint with filters scoped to created entities
  const analyticsRequestBody = {
    post_ids: [post.id],
    community_ids: [community.id],
    author_memberuser_ids: undefined,
    status: undefined,
    created_from: null,
    created_to: null,
    min_score: null,
    max_score: null,
    min_reply_count: null,
    max_reply_count: null,
    sort_by: "score",
    sort_direction: "desc",
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies ICommunityPlatformCommentAnalytics.IRequest;

  const analyticsPage: IPageICommunityPlatformCommentAnalytics.ISummary =
    await api.functional.communityPlatform.adminUser.analytics.comments.index(
      connection,
      {
        body: analyticsRequestBody,
      },
    );
  typia.assert(analyticsPage);

  // 8. Validate pagination metadata
  const pagination: IPage.IPagination = analyticsPage.pagination;
  typia.assert(pagination);

  TestValidator.equals(
    "pagination current page should be 1",
    pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should match requested limit",
    pagination.limit,
    analyticsRequestBody.limit,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be >= 0",
    pagination.pages >= 0,
  );

  // 9. Validate analytics data list basics
  const analyticsList = analyticsPage.data;
  TestValidator.predicate(
    "analytics data length does not exceed limit",
    analyticsList.length <= analyticsRequestBody.limit,
  );

  if (analyticsList.length > 0) {
    const first = analyticsList[0];
    typia.assert(first);

    TestValidator.equals(
      "analytics post_id should equal created post id",
      first.post_id,
      post.id,
    );
    TestValidator.equals(
      "analytics community_id should equal created community id",
      first.community_id,
      community.id,
    );

    TestValidator.predicate(
      "upvote_count is non-negative",
      first.upvote_count >= 0,
    );
    TestValidator.predicate(
      "downvote_count is non-negative",
      first.downvote_count >= 0,
    );
    TestValidator.predicate(
      "reply_count is non-negative",
      first.reply_count >= 0,
    );
  }
}
