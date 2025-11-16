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

export async function test_api_admin_comment_analytics_multipost_and_multicommunity_filters(
  connection: api.IConnection,
) {
  // 1. Admin user registration (join) and keep credentials
  const adminUsername = RandomGenerator.name(1);
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "Adm1nPass!";

  const adminJoinBody = {
    username: adminUsername,
    email: adminEmail,
    password: "Adm1nPass!" as string & tags.Format<"password">,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminJoin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminJoin);

  // 2. Member user registration (join)
  const memberUsername = RandomGenerator.name(1);
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "MemberPass1";
  const memberJoinBody = {
    username: memberUsername,
    email: memberEmail,
    password: memberPassword as string & tags.MinLength<8>,
    ip: null,
    href: "https://client.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://client.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberJoin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberJoin);

  // 3. Ensure memberUser is logged in (login)
  const memberLoginBody = {
    identifier: memberEmail,
    password: memberPassword,
    ip: null,
    href: "https://client.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://client.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies ICommunityPlatformMemberuser.ILogin;

  const memberLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLogin);

  // 4. Create two communities as memberUser
  const communityBodies: ICommunityPlatformCommunity.ICreate[] = [
    {
      slug: `comm-${RandomGenerator.alphaNumeric(8)}` as string &
        tags.MinLength<1> &
        tags.MaxLength<128>,
      name: RandomGenerator.name(),
      description: RandomGenerator.paragraph({ sentences: 5 }) as string &
        tags.MaxLength<4000>,
      visibility: "public",
      status: "active",
      is_nsfw: false,
      is_quarantined: false,
      is_posting_restricted: false,
      allow_text_posts: true,
      allow_link_posts: true,
      allow_image_posts: true,
    },
    {
      slug: `comm-${RandomGenerator.alphaNumeric(8)}` as string &
        tags.MinLength<1> &
        tags.MaxLength<128>,
      name: RandomGenerator.name(),
      description: RandomGenerator.paragraph({ sentences: 5 }) as string &
        tags.MaxLength<4000>,
      visibility: "public",
      status: "active",
      is_nsfw: false,
      is_quarantined: false,
      is_posting_restricted: false,
      allow_text_posts: true,
      allow_link_posts: true,
      allow_image_posts: true,
    },
  ];

  const communities: ICommunityPlatformCommunity[] = [];
  for (const body of communityBodies) {
    const community =
      await api.functional.communityPlatform.memberUser.communities.create(
        connection,
        { body },
      );
    typia.assert(community);
    communities.push(community);
  }

  // 5. Create memberships in each community for the member user
  const memberships: ICommunityPlatformCommunityMembership[] = [];
  for (const community of communities) {
    const membershipBody = {
      role: "member",
      isApproved: true,
      isBanned: false,
    } satisfies ICommunityPlatformCommunityMembership.ICreate;

    const membership =
      await api.functional.communityPlatform.memberUser.communities.memberships.create(
        connection,
        {
          communitySlug: community.slug,
          body: membershipBody,
        },
      );
    typia.assert(membership);
    memberships.push(membership);
  }

  // 6. Create posts: 3 posts total, at least 2 across different communities
  const posts: ICommunityPlatformPost[] = [];
  const postCommunityMapping: {
    post: ICommunityPlatformPost;
    community: ICommunityPlatformCommunity;
  }[] = [];

  // Two posts that will be included in analytics (one per community)
  for (const community of communities) {
    const postBody = {
      communityId: community.id,
      communityCode: community.slug,
      title: RandomGenerator.paragraph({ sentences: 3 }),
      body: RandomGenerator.paragraph({ sentences: 10 }),
      url: undefined,
      postType: "text",
    } satisfies ICommunityPlatformPost.ICreate;

    const post = await api.functional.communityPlatform.memberUser.posts.create(
      connection,
      { body: postBody },
    );
    typia.assert(post);
    posts.push(post);
    postCommunityMapping.push({ post, community });
  }

  // One extra post (excluded) in the first community
  const extraPostBody = {
    communityId: communities[0].id,
    communityCode: communities[0].slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.paragraph({ sentences: 10 }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const extraPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: extraPostBody,
    });
  typia.assert(extraPost);
  posts.push(extraPost);
  postCommunityMapping.push({ post: extraPost, community: communities[0] });

  // 7. Create comments on each post
  const commentsByPostId = new Map<string, ICommunityPlatformComment[]>();

  const createCommentForPost = async (
    post: ICommunityPlatformPost,
  ): Promise<ICommunityPlatformComment> => {
    const commentBody = {
      content: RandomGenerator.paragraph({ sentences: 4 }) as string &
        tags.MinLength<1> &
        tags.MaxLength<10000>,
      parentCommentId: undefined,
    } satisfies ICommunityPlatformComment.ICreate;

    const comment =
      await api.functional.communityPlatform.memberUser.posts.comments.create(
        connection,
        {
          postId: post.id,
          body: commentBody,
        },
      );
    typia.assert(comment);

    const existing = commentsByPostId.get(post.id) ?? [];
    existing.push(comment);
    commentsByPostId.set(post.id, existing);
    return comment;
  };

  // Create at least one comment per post
  for (const post of posts) {
    await createCommentForPost(post);
  }

  // 8. Switch to adminUser context (login) before calling analytics
  const adminLoginBody = {
    identifier: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminLogin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  // 9. Prepare analytics filters: include first two posts (across two communities), exclude extraPost
  const includedPosts = [posts[0], posts[1]];
  const includedPostIds = includedPosts.map((p) => p.id);
  const includedCommunityIds = Array.from(
    new Set(
      postCommunityMapping
        .filter((m) => includedPostIds.includes(m.post.id))
        .map((m) => m.community.id),
    ),
  );

  const excludedPostIds = [extraPost.id];
  const excludedCommentIds = excludedPostIds.flatMap((postId) => {
    const list = commentsByPostId.get(postId) ?? [];
    return list.map((c) => c.id);
  });

  const includedCommentIds = includedPostIds.flatMap((postId) => {
    const list = commentsByPostId.get(postId) ?? [];
    return list.map((c) => c.id);
  });

  TestValidator.predicate(
    "there should be comments on included posts",
    includedCommentIds.length > 0,
  );

  // 10. Call analytics endpoint
  const analyticsRequestBody = {
    post_ids: includedPostIds,
    community_ids: includedCommunityIds,
    author_memberuser_ids: undefined,
    status: undefined,
    created_from: null,
    created_to: null,
    min_score: null,
    max_score: null,
    min_reply_count: null,
    max_reply_count: null,
    sort_by: undefined,
    sort_direction: undefined,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 50 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies ICommunityPlatformCommentAnalytics.IRequest;

  const analyticsPage: IPageICommunityPlatformCommentAnalytics.ISummary =
    await api.functional.communityPlatform.adminUser.analytics.comments.index(
      connection,
      {
        body: analyticsRequestBody,
      },
    );
  typia.assert(analyticsPage);

  const { pagination, data } = analyticsPage;

  // 11. Basic sanity checks: there should be at least one analytics record
  TestValidator.predicate(
    "analytics should return at least one row for included comments",
    data.length > 0,
  );

  // 12. Validate that each analytics row belongs to included posts and communities
  const analyticsCommentIds: string[] = [];
  const analyticsCommunityIds: Set<string> = new Set();

  for (const row of data) {
    TestValidator.predicate(
      "analytics row post_id must be one of included posts",
      includedPostIds.includes(row.post_id),
    );

    TestValidator.predicate(
      "analytics row community_id must be one of included communities",
      includedCommunityIds.includes(row.community_id),
    );

    analyticsCommentIds.push(row.comment_id);
    analyticsCommunityIds.add(row.community_id);
  }

  // Ensure that analytics covered at least two communities (multi-community)
  TestValidator.predicate(
    "analytics should span multiple communities when filters do",
    analyticsCommunityIds.size >= 2,
  );

  // 13. Verify that comments from excluded posts are not present
  for (const excludedCommentId of excludedCommentIds) {
    TestValidator.predicate(
      "excluded post comments must not appear in analytics",
      !analyticsCommentIds.includes(excludedCommentId),
    );
  }

  // 14. Pagination metadata validation
  TestValidator.equals(
    "pagination current page should equal requested page",
    pagination.current,
    analyticsRequestBody.page,
  );
  TestValidator.equals(
    "pagination limit should equal requested limit",
    pagination.limit,
    analyticsRequestBody.limit,
  );
  TestValidator.predicate(
    "pagination records should be >= data length",
    pagination.records >= data.length,
  );
  TestValidator.predicate(
    "pagination pages should be at least 1 when records exist",
    pagination.pages >= 1,
  );
}
