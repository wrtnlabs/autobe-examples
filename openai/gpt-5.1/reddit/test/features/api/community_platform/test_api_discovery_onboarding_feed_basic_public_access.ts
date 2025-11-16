import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserLogin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformDiscoveryFeedOnboarding } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformDiscoveryFeedOnboarding";
import type { ICommunityPlatformDiscoveryItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformDiscoveryItem";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformDiscoveryItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformDiscoveryItem";

export async function test_api_discovery_onboarding_feed_basic_public_access(
  connection: api.IConnection,
) {
  // 1. Register memberUser (content owner)
  const memberJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/signup",
    referrer: "https://example.com/",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: null,
    href: "https://example.com/login",
    referrer: "https://example.com/",
  } satisfies ICommunityPlatformMemberuser.ILogin;

  // 2. Register adminUser
  const adminJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  const adminLoginBody = {
    identifier: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://example.com/admin/login",
    referrer: "https://example.com/",
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  // 3. Ensure connection is authenticated as memberUser for member-only ops
  const memberLoginResult: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginResult);

  // 4. Member creates community
  const communitySlug = RandomGenerator.alphabets(16);

  const communityCreateBody = {
    slug: communitySlug as string & tags.MinLength<1> & tags.MaxLength<128>,
    name: RandomGenerator.paragraph({ sentences: 2 }) as string &
      tags.MinLength<1> &
      tags.MaxLength<255>,
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
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);

  // 5. Member joins the community
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

  // 6. Member creates primary post
  const postCreateBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 1 }),
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);

  // 7. Member creates a second post that will be used as an ineligible discovery target
  const secondPostCreateBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 1 }),
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const secondPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: secondPostCreateBody,
    });
  typia.assert(secondPost);

  // 8. Member creates a comment on the primary post
  const commentCreateBody = {
    content: RandomGenerator.paragraph({ sentences: 2 }) as string &
      tags.MinLength<1> &
      tags.MaxLength<10000>,
  } satisfies ICommunityPlatformComment.ICreate;

  const comment: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: post.id as string & tags.Format<"uuid">,
        body: commentCreateBody,
      },
    );
  typia.assert(comment);

  // 9. Member upvotes the primary post
  const postVoteCreateBody = {
    direction: "up",
  } satisfies ICommunityPlatformPostVote.ICreate;

  const postVote: ICommunityPlatformPostVote =
    await api.functional.communityPlatform.memberUser.posts.votes.create(
      connection,
      {
        postId: post.id as string & tags.Format<"uuid">,
        body: postVoteCreateBody,
      },
    );
  typia.assert(postVote);

  // 10. Member upvotes the comment
  const commentVoteCreateBody = {
    direction: "up",
  } satisfies ICommunityPlatformCommentVote.ICreate;

  const commentVote: ICommunityPlatformCommentVote =
    await api.functional.communityPlatform.memberUser.comments.votes.create(
      connection,
      {
        commentId: comment.id as string & tags.Format<"uuid">,
        body: commentVoteCreateBody,
      },
    );
  typia.assert(commentVote);

  // 11. Switch to adminUser for discovery item creation
  const adminLoginResult: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginResult);

  const now = new Date();
  const startAt = new Date(now.getTime() - 60_000).toISOString();
  const endAt = new Date(now.getTime() + 24 * 60 * 60_000).toISOString();

  // Eligible onboarding discovery item for the primary post
  const onboardingDiscoveryCreateBody = {
    target_type: "post",
    target_id: post.id,
    context: "onboarding",
    priority_score: 100,
    start_at: startAt,
    end_at: endAt,
    status: "active",
  } satisfies ICommunityPlatformDiscoveryItem.ICreate;

  const onboardingDiscoveryItem: ICommunityPlatformDiscoveryItem =
    await api.functional.communityPlatform.adminUser.discovery.items.create(
      connection,
      {
        body: onboardingDiscoveryCreateBody,
      },
    );
  typia.assert(onboardingDiscoveryItem);

  // Ineligible discovery item (paused) for the second post
  const ineligibleDiscoveryCreateBody = {
    target_type: "post",
    target_id: secondPost.id,
    context: "onboarding",
    priority_score: 50,
    start_at: startAt,
    end_at: endAt,
    status: "paused",
  } satisfies ICommunityPlatformDiscoveryItem.ICreate;

  const ineligibleDiscoveryItem: ICommunityPlatformDiscoveryItem =
    await api.functional.communityPlatform.adminUser.discovery.items.create(
      connection,
      {
        body: ineligibleDiscoveryCreateBody,
      },
    );
  typia.assert(ineligibleDiscoveryItem);

  // 12. Authenticated onboarding feed call (sanity)
  const page = 1 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const limit = 10 as number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100>;

  const onboardingRequestBody = {
    page,
    limit,
    cursor: null,
    locale: "en-US",
    platform: "web",
  } satisfies ICommunityPlatformDiscoveryFeedOnboarding.IRequest;

  const authenticatedFeed: IPageICommunityPlatformDiscoveryItem.ISummary =
    await api.functional.communityPlatform.discovery.feeds.onboarding.index(
      connection,
      {
        body: onboardingRequestBody,
      },
    );
  typia.assert(authenticatedFeed);

  const authPagination = authenticatedFeed.pagination;
  TestValidator.equals(
    "authenticated pagination current page",
    authPagination.current,
    page,
  );
  TestValidator.equals(
    "authenticated pagination limit",
    authPagination.limit,
    limit,
  );
  TestValidator.predicate(
    "authenticated records >= data length",
    authPagination.records >= authenticatedFeed.data.length,
  );

  if (authPagination.records > 0) {
    TestValidator.predicate(
      "authenticated pages at least 1 when records > 0",
      authPagination.pages >= 1,
    );
  }

  const authOnboardingItem = authenticatedFeed.data.find(
    (item) => item.resourceId === post.id,
  );

  TestValidator.predicate(
    "authenticated feed should contain onboarding item for created post",
    authOnboardingItem !== undefined,
  );

  const authIneligibleItem = authenticatedFeed.data.find(
    (item) => item.resourceId === secondPost.id,
  );

  TestValidator.predicate(
    "authenticated feed should not contain paused discovery item target",
    authIneligibleItem === undefined,
  );

  // 13. Public (unauthenticated) onboarding feed call
  const publicConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  const publicFeed: IPageICommunityPlatformDiscoveryItem.ISummary =
    await api.functional.communityPlatform.discovery.feeds.onboarding.index(
      publicConnection,
      {
        body: onboardingRequestBody,
      },
    );
  typia.assert(publicFeed);

  const publicPagination = publicFeed.pagination;
  TestValidator.equals(
    "public pagination current page",
    publicPagination.current,
    page,
  );
  TestValidator.equals(
    "public pagination limit",
    publicPagination.limit,
    limit,
  );
  TestValidator.predicate(
    "public records >= data length",
    publicPagination.records >= publicFeed.data.length,
  );

  if (publicPagination.records > 0) {
    TestValidator.predicate(
      "public pages at least 1 when records > 0",
      publicPagination.pages >= 1,
    );
  }

  const publicOnboardingItem = publicFeed.data.find(
    (item) => item.resourceId === post.id,
  );
  TestValidator.predicate(
    "public feed should contain onboarding item for created post",
    publicOnboardingItem !== undefined,
  );

  const publicIneligibleItem = publicFeed.data.find(
    (item) => item.resourceId === secondPost.id,
  );
  TestValidator.predicate(
    "public feed should not contain paused discovery item target",
    publicIneligibleItem === undefined,
  );

  TestValidator.predicate(
    "both authenticated and public feeds contain onboarding item for created post",
    authOnboardingItem !== undefined && publicOnboardingItem !== undefined,
  );
}
