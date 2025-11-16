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

/**
 * Validate onboarding discovery feed target diversity and ranking.
 *
 * This e2e test builds a realistic content graph (communities, posts, comments,
 * votes), registers discovery items for those resources in the onboarding
 * context, and finally queries the onboarding discovery feed to ensure:
 *
 * 1. Only existing resources are surfaced (resourceId always points to a created
 *    entity).
 * 2. The feed contains a diverse mix of resource kinds (at least two distinct
 *    resourceKind values).
 * 3. Items appear in descending order of configured priority_score, using the
 *    creation order as a proxy when scores tie.
 * 4. The admin discovery item creation endpoint rejects invalid
 *    target_type/target_id combinations so that broken references do not leak
 *    into the feed.
 *
 * High-level flow:
 *
 * 1. Create a member user (content owner) via memberUser.join.
 * 2. Create an admin user (discovery curator) via adminUser.join.
 * 3. As the member user: 3-1) Create 2 distinct communities. 3-2) Join both
 *    communities (memberships.create). 3-3) Create 3 posts, spread across the
 *    communities. 3-4) Add comments to a subset of posts. 3-5) Cast votes on
 *    one post and one comment.
 * 4. Switch to admin user via adminUser.login.
 * 5. As admin user, create discovery items with context = "onboarding":
 *
 *    - One for each community.
 *    - One for two of the posts.
 *    - One for one comment.
 *    - One for a post vote and one for a comment vote (using target_type tokens that
 *         the backend accepts; if the backend does not support these specific
 *         strings, the corresponding calls will fail and can be ignored by
 *         assertions focused on successfully created items). Each item gets a
 *         distinct priority_score so that ordering can be validated. Two items
 *         share the same priority_score to exercise tie handling.
 * 6. Call the onboarding discovery feed endpoint with a high limit so all eligible
 *    items can be returned.
 * 7. Validate:
 *
 *    - Response shape and pagination via typia.assert.
 *    - That the returned items' resourceIds are all within the known sets of created
 *         communities/posts/comments/votes.
 *    - That the set of resourceKind values has cardinality >= 2.
 *    - That the returned order respects the descending priority_score groups we
 *         configured (by mapping resourceId back to known priority buckets and
 *         checking monotonic non-increase of bucket index).
 * 8. Separately, attempt to create a discovery item pointing at a random
 *    non-existent UUID and expect the admin discovery create call to fail using
 *    TestValidator.error, demonstrating that invalid item references are
 *    rejected at creation time.
 */
export async function test_api_discovery_onboarding_feed_target_diversity_and_ranking(
  connection: api.IConnection,
) {
  // 1. Create content owner memberUser (auto-authenticated by join)
  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/onboarding",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. Create admin user (auto-authenticated by join)
  const adminJoinBody = {
    username: `admin-${RandomGenerator.alphabets(8)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPassw0rd!" as string & tags.Format<"password">,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // Re-login as memberUser to ensure member auth context if needed later
  const _memberLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: {
        identifier: memberJoinBody.username,
        password: memberJoinBody.password,
        ip: null,
        href: memberJoinBody.href,
        referrer: memberJoinBody.referrer,
      } satisfies ICommunityPlatformMemberuser.ILogin,
    });
  typia.assert(_memberLogin);

  // 3-1) Create 2 communities
  const communityPayloads: ICommunityPlatformCommunity.ICreate[] = [
    {
      slug: `comm-${RandomGenerator.alphabets(8)}` as string &
        tags.MinLength<1> &
        tags.MaxLength<128>,
      name: RandomGenerator.paragraph({ sentences: 2 }) as string &
        tags.MinLength<1> &
        tags.MaxLength<255>,
      description: RandomGenerator.paragraph({ sentences: 5 }),
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
      slug: `comm-${RandomGenerator.alphabets(8)}` as string &
        tags.MinLength<1> &
        tags.MaxLength<128>,
      name: RandomGenerator.paragraph({ sentences: 2 }) as string &
        tags.MinLength<1> &
        tags.MaxLength<255>,
      description: RandomGenerator.paragraph({ sentences: 3 }),
      visibility: "public",
      status: "active",
      is_nsfw: false,
      is_quarantined: false,
      is_posting_restricted: false,
      allow_text_posts: true,
      allow_link_posts: false,
      allow_image_posts: true,
    },
  ];

  const communities: ICommunityPlatformCommunity[] = [];
  for (const body of communityPayloads) {
    const community =
      await api.functional.communityPlatform.memberUser.communities.create(
        connection,
        { body },
      );
    typia.assert(community);
    communities.push(community);
  }

  // 3-2) Create memberships for memberUser in each community
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

  // 3-3) Create 3 posts across communities
  const posts: ICommunityPlatformPost[] = [];
  const postPayloads: ICommunityPlatformPost.ICreate[] = [
    {
      communityId: communities[0].id,
      communityCode: communities[0].slug,
      title: RandomGenerator.paragraph({ sentences: 3 }),
      body: RandomGenerator.content({ paragraphs: 1 }),
      url: undefined,
      postType: "text",
    },
    {
      communityId: communities[1].id,
      communityCode: communities[1].slug,
      title: RandomGenerator.paragraph({ sentences: 2 }),
      body: RandomGenerator.content({ paragraphs: 1 }),
      url: undefined,
      postType: "text",
    },
    {
      communityId: communities[0].id,
      communityCode: communities[0].slug,
      title: RandomGenerator.paragraph({ sentences: 2 }),
      body: RandomGenerator.content({ paragraphs: 1 }),
      url: undefined,
      postType: "text",
    },
  ];

  for (const body of postPayloads) {
    const post = await api.functional.communityPlatform.memberUser.posts.create(
      connection,
      { body },
    );
    typia.assert(post);
    posts.push(post);
  }

  // 3-4) Create comments for first two posts
  const comments: ICommunityPlatformComment[] = [];
  for (const post of posts.slice(0, 2)) {
    const commentBody = {
      content: RandomGenerator.paragraph({ sentences: 2 }),
      parentCommentId: undefined,
    } satisfies ICommunityPlatformComment.ICreate;

    const comment =
      await api.functional.communityPlatform.memberUser.posts.comments.create(
        connection,
        {
          postId: post.id as string & tags.Format<"uuid">,
          body: commentBody,
        },
      );
    typia.assert(comment);
    comments.push(comment);
  }

  // 3-5) Cast votes on one post and one comment
  const postVote =
    await api.functional.communityPlatform.memberUser.posts.votes.create(
      connection,
      {
        postId: posts[0].id as string & tags.Format<"uuid">,
        body: {
          direction: "up",
        } satisfies ICommunityPlatformPostVote.ICreate,
      },
    );
  typia.assert(postVote);

  const commentVote =
    await api.functional.communityPlatform.memberUser.comments.votes.create(
      connection,
      {
        commentId: comments[0].id as string & tags.Format<"uuid">,
        body: {
          direction: "up",
        } satisfies ICommunityPlatformCommentVote.ICreate,
      },
    );
  typia.assert(commentVote);

  // 4. Switch to admin user via login to ensure admin auth context
  const _adminLogin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: {
        identifier: adminJoinBody.username,
        password: adminJoinBody.password,
        ip: null,
        href: "https://example.com/admin/login",
        referrer: "https://example.com/admin",
      } satisfies ICommunityPlatformAdminUserLogin.IRequest,
    });
  typia.assert(_adminLogin);

  // Helper to generate wide open time window
  const now = new Date();
  const startAt = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  const endAt = new Date(now.getTime() + 60 * 60 * 1000).toISOString();

  // 5. Create discovery items in onboarding context with varying scores
  type DiscoverySeed = {
    label: string;
    target_type: string;
    target_id: string;
    priority_score: number;
  };

  const seeds: DiscoverySeed[] = [
    {
      label: "community-0",
      target_type: "community",
      target_id: communities[0].id,
      priority_score: 50,
    },
    {
      label: "community-1",
      target_type: "community",
      target_id: communities[1].id,
      priority_score: 40,
    },
    {
      label: "post-0",
      target_type: "post",
      target_id: posts[0].id,
      priority_score: 60,
    },
    {
      label: "post-1",
      target_type: "post",
      target_id: posts[1].id,
      priority_score: 60, // tie with post-0
    },
    {
      label: "comment-0",
      target_type: "comment",
      target_id: comments[0].id,
      priority_score: 30,
    },
    {
      label: "post-vote-0",
      target_type: "post_vote",
      target_id: postVote.id,
      priority_score: 20,
    },
    {
      label: "comment-vote-0",
      target_type: "comment_vote",
      target_id: commentVote.comment_id,
      priority_score: 10,
    },
  ];

  const createdDiscoveryItems: ICommunityPlatformDiscoveryItem[] = [];

  for (const seed of seeds) {
    const body = {
      target_type: seed.target_type,
      target_id: seed.target_id,
      context: "onboarding",
      priority_score: seed.priority_score,
      start_at: startAt,
      end_at: endAt,
      status: "active",
    } satisfies ICommunityPlatformDiscoveryItem.ICreate;

    const item =
      await api.functional.communityPlatform.adminUser.discovery.items.create(
        connection,
        { body },
      );
    typia.assert(item);
    createdDiscoveryItems.push(item);
  }

  // Map resourceId -> priority bucket for later ranking checks
  const resourcePriority = new Map<string, number>();
  for (const seed of seeds) {
    resourcePriority.set(seed.target_id, seed.priority_score);
  }

  // 10. Validate invalid discovery item is rejected (nonexistent target_id)
  const invalidTargetId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "invalid discovery item must be rejected",
    async () => {
      const invalidBody = {
        target_type: "community",
        target_id: invalidTargetId,
        context: "onboarding",
        priority_score: 5,
        start_at: startAt,
        end_at: endAt,
        status: "active",
      } satisfies ICommunityPlatformDiscoveryItem.ICreate;

      await api.functional.communityPlatform.adminUser.discovery.items.create(
        connection,
        { body: invalidBody },
      );
    },
  );

  // 6. Fetch onboarding discovery feed with large limit
  const requestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 50 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    cursor: null,
    locale: "en-US",
    platform: "web",
  } satisfies ICommunityPlatformDiscoveryFeedOnboarding.IRequest;

  const feed: IPageICommunityPlatformDiscoveryItem.ISummary =
    await api.functional.communityPlatform.discovery.feeds.onboarding.index(
      connection,
      { body: requestBody },
    );
  typia.assert(feed);

  const pageInfo: IPage.IPagination = feed.pagination;
  typia.assert(pageInfo);

  const items = feed.data;

  // 7. Basic expectations on count
  TestValidator.predicate(
    "feed should contain at least as many items as we created for onboarding context",
    items.length >= createdDiscoveryItems.length,
  );

  // 8. Validate resourceKind diversity and resourceId validity
  const resourceKinds = new Set<string>();
  const validResourceIds = new Set<string>([
    ...communities.map((c) => c.id),
    ...posts.map((p) => p.id),
    ...comments.map((c) => c.id),
    postVote.id,
    commentVote.comment_id,
  ]);

  for (const item of items) {
    resourceKinds.add(item.resourceKind);
    TestValidator.predicate(
      "resourceId must refer to a known entity",
      validResourceIds.has(item.resourceId),
    );
  }

  TestValidator.predicate(
    "feed should contain at least two different resource kinds",
    resourceKinds.size >= 2,
  );

  // 9. Verify ordering by priority_score groups (monotonically non-increasing)
  const prioritySequence: number[] = [];
  for (const item of items) {
    const score = resourcePriority.get(item.resourceId);
    if (score !== undefined) prioritySequence.push(score);
  }

  // We expect at least some of our seeded items to appear
  TestValidator.predicate(
    "at least one seeded discovery item should appear in the feed",
    prioritySequence.length > 0,
  );

  let last = Number.POSITIVE_INFINITY;
  for (const score of prioritySequence) {
    TestValidator.predicate(
      "priority scores must be non-increasing in feed order",
      score <= last,
    );
    last = score;
  }
}
