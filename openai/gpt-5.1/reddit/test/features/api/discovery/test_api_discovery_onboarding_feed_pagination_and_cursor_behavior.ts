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
 * Validate onboarding discovery feed pagination and cursor behavior.
 *
 * Business flow:
 *
 * 1. Register a memberUser account for creating communities, posts, comments, and
 *    votes.
 * 2. Register an adminUser account for inserting discovery items.
 * 3. As memberUser, create two public communities with distinct slugs.
 * 4. Join the memberUser into each community using the memberships API.
 * 5. In each community, create multiple posts, comments, and votes to simulate
 *    engagement.
 * 6. As adminUser, create multiple discovery items targeting the created posts
 *    with context "onboarding" and varying priority_score so that total items
 *    exceed a small page limit.
 * 7. Exercise page-based pagination on the onboarding feed: request page 1 and
 *    page 2 with the same limit, verifying page metadata and that the item sets
 *    do not overlap.
 * 8. Exercise a cursor-like flow by first calling without cursor (using only
 *    limit) and then calling again with an opaque cursor token derived from the
 *    first page, verifying that the second result set does not overlap with the
 *    first.
 * 9. Request a very high page index to confirm that the endpoint handles
 *    beyond-end pagination gracefully without errors (empty or partial page
 *    allowed).
 *
 * This test focuses on business-level pagination and cursor behavior and
 * purposely avoids any type-error or schema-violation scenarios.
 */
export async function test_api_discovery_onboarding_feed_pagination_and_cursor_behavior(
  connection: api.IConnection,
) {
  // 1. Register memberUser
  const memberJoinBody = {
    username: RandomGenerator.alphabets(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://client.example.com/onboarding",
    referrer: "https://client.example.com/",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberUser: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberUser);

  // 2. Register adminUser
  const adminJoinBody = {
    username: RandomGenerator.alphabets(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminUser: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminUser);

  // 3. As memberUser (already authenticated by previous join), create two communities
  const communityInputs: ICommunityPlatformCommunity.ICreate[] = [
    {
      slug: `comm-${RandomGenerator.alphabets(6)}`,
      name: RandomGenerator.name(2),
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
      slug: `comm-${RandomGenerator.alphabets(6)}`,
      name: RandomGenerator.name(2),
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
  ];

  const communities: ICommunityPlatformCommunity[] = [];
  for (const body of communityInputs) {
    const community =
      await api.functional.communityPlatform.memberUser.communities.create(
        connection,
        { body },
      );
    typia.assert<ICommunityPlatformCommunity>(community);
    communities.push(community);
  }

  // 4. Create memberships for memberUser in each community
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
    typia.assert<ICommunityPlatformCommunityMembership>(membership);
    memberships.push(membership);
  }

  // 5. In each community, create posts, comments, and votes
  const allPosts: ICommunityPlatformPost[] = [];
  const allComments: ICommunityPlatformComment[] = [];

  for (const community of communities) {
    const postCount = 3;
    for (let i = 0; i < postCount; i++) {
      const postBody = {
        communityId: community.id,
        communityCode: community.slug,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({ paragraphs: 1 }),
        url: undefined,
        postType: "text",
      } satisfies ICommunityPlatformPost.ICreate;

      const post =
        await api.functional.communityPlatform.memberUser.posts.create(
          connection,
          { body: postBody },
        );
      typia.assert<ICommunityPlatformPost>(post);
      allPosts.push(post);

      // Create comments for each post
      const commentCount = 2;
      for (let j = 0; j < commentCount; j++) {
        const commentBody = {
          content: RandomGenerator.paragraph({ sentences: 2 }),
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
        typia.assert<ICommunityPlatformComment>(comment);
        allComments.push(comment);

        // Votes on comment to simulate engagement
        const commentVoteBody = {
          direction: RandomGenerator.pick(["up", "down"] as const),
        } satisfies ICommunityPlatformCommentVote.ICreate;

        const commentVote =
          await api.functional.communityPlatform.memberUser.comments.votes.create(
            connection,
            {
              commentId: comment.id,
              body: commentVoteBody,
            },
          );
        typia.assert<ICommunityPlatformCommentVote>(commentVote);
      }

      // Votes on post to simulate engagement
      const voteIterations = 3;
      for (let k = 0; k < voteIterations; k++) {
        const postVoteBody = {
          direction: RandomGenerator.pick(["up", "down"] as const),
        } satisfies ICommunityPlatformPostVote.ICreate;

        const postVote =
          await api.functional.communityPlatform.memberUser.posts.votes.create(
            connection,
            {
              postId: post.id,
              body: postVoteBody,
            },
          );
        typia.assert<ICommunityPlatformPostVote>(postVote);
      }
    }
  }

  // 6. Switch to adminUser to create discovery items
  const adminLoginBody = {
    identifier: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/console",
    referrer: "https://admin.example.com/login",
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminLogin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminLogin);

  // Create discovery items targeting posts with context "onboarding".
  const discoveryItems: ICommunityPlatformDiscoveryItem[] = [];
  const limit = 3; // small page size for pagination tests
  const discoveryItemCount = limit * 3; // ensure more items than 2 pages

  for (let i = 0; i < discoveryItemCount; i++) {
    const targetPost = allPosts[i % allPosts.length];

    const now = new Date();
    const startAt = now.toISOString();
    const endAt = new Date(
      now.getTime() + 7 * 24 * 60 * 60 * 1000,
    ).toISOString();

    const discoveryBody = {
      target_type: "post",
      target_id: targetPost.id,
      context: "onboarding",
      priority_score: i + 1,
      start_at: startAt,
      end_at: endAt,
      status: "active",
    } satisfies ICommunityPlatformDiscoveryItem.ICreate;

    const item =
      await api.functional.communityPlatform.adminUser.discovery.items.create(
        connection,
        { body: discoveryBody },
      );
    typia.assert<ICommunityPlatformDiscoveryItem>(item);
    discoveryItems.push(item);
  }

  // 7. Page-based pagination: page 1 and 2
  const page1Request = {
    page: 1,
    limit,
    cursor: null,
    locale: "en-US",
    platform: "web",
  } satisfies ICommunityPlatformDiscoveryFeedOnboarding.IRequest;

  const page1: IPageICommunityPlatformDiscoveryItem.ISummary =
    await api.functional.communityPlatform.discovery.feeds.onboarding.index(
      connection,
      { body: page1Request },
    );
  typia.assert<IPageICommunityPlatformDiscoveryItem.ISummary>(page1);

  TestValidator.equals(
    "page 1 pagination current should be 1",
    page1.pagination.current,
    1,
  );
  TestValidator.equals(
    "page 1 pagination limit should match request",
    page1.pagination.limit,
    limit,
  );
  TestValidator.predicate(
    "page 1 data length should be <= limit and > 0 when enough items exist",
    page1.data.length > 0 && page1.data.length <= limit,
  );

  const page2Request = {
    page: 2,
    limit,
    cursor: null,
    locale: "en-US",
    platform: "web",
  } satisfies ICommunityPlatformDiscoveryFeedOnboarding.IRequest;

  const page2: IPageICommunityPlatformDiscoveryItem.ISummary =
    await api.functional.communityPlatform.discovery.feeds.onboarding.index(
      connection,
      { body: page2Request },
    );
  typia.assert<IPageICommunityPlatformDiscoveryItem.ISummary>(page2);

  TestValidator.equals(
    "page 2 pagination current should be 2",
    page2.pagination.current,
    2,
  );
  TestValidator.equals(
    "page 2 pagination limit should match request",
    page2.pagination.limit,
    limit,
  );

  // Ensure items of page 1 and 2 do not overlap
  const page1Ids = page1.data.map((d) => d.id);
  const page2Ids = page2.data.map((d) => d.id);
  const intersection = page1Ids.filter((id) => page2Ids.includes(id));
  TestValidator.equals(
    "page 1 and page 2 should have no overlapping discovery item ids",
    intersection.length,
    0,
  );

  // 8. Cursor-like flow using IRequest.cursor
  const cursorFirstRequest = {
    page: undefined,
    limit,
    cursor: null,
    locale: "en-US",
    platform: "web",
  } satisfies ICommunityPlatformDiscoveryFeedOnboarding.IRequest;

  const cursorPage1: IPageICommunityPlatformDiscoveryItem.ISummary =
    await api.functional.communityPlatform.discovery.feeds.onboarding.index(
      connection,
      { body: cursorFirstRequest },
    );
  typia.assert<IPageICommunityPlatformDiscoveryItem.ISummary>(cursorPage1);

  const cursorToken =
    cursorPage1.data.length > 0
      ? cursorPage1.data[cursorPage1.data.length - 1].id
      : null;

  const cursorSecondRequest = {
    page: undefined,
    limit,
    cursor: cursorToken,
    locale: "en-US",
    platform: "web",
  } satisfies ICommunityPlatformDiscoveryFeedOnboarding.IRequest;

  const cursorPage2: IPageICommunityPlatformDiscoveryItem.ISummary =
    await api.functional.communityPlatform.discovery.feeds.onboarding.index(
      connection,
      { body: cursorSecondRequest },
    );
  typia.assert<IPageICommunityPlatformDiscoveryItem.ISummary>(cursorPage2);

  const cursorPage1Ids = cursorPage1.data.map((d) => d.id);
  const cursorPage2Ids = cursorPage2.data.map((d) => d.id);
  const cursorIntersection = cursorPage1Ids.filter((id) =>
    cursorPage2Ids.includes(id),
  );

  TestValidator.equals(
    "cursor-based first and second pages should not overlap when cursor is provided",
    cursorIntersection.length,
    0,
  );

  // 9. Beyond-end behavior with page-based pagination: use a very high page index
  const highPageRequest = {
    page: 1000,
    limit,
    cursor: null,
    locale: "en-US",
    platform: "web",
  } satisfies ICommunityPlatformDiscoveryFeedOnboarding.IRequest;

  const highPage: IPageICommunityPlatformDiscoveryItem.ISummary =
    await api.functional.communityPlatform.discovery.feeds.onboarding.index(
      connection,
      { body: highPageRequest },
    );
  typia.assert<IPageICommunityPlatformDiscoveryItem.ISummary>(highPage);

  TestValidator.predicate(
    "high page request should not throw and can return empty or partial data",
    highPage.data.length >= 0,
  );
}
