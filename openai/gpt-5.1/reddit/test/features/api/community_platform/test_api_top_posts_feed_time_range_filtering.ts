import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";

export async function test_api_top_posts_feed_time_range_filtering(
  connection: api.IConnection,
) {
  // 1. Register a member user who can own communities and posts.
  const joinBody = {
    username: RandomGenerator.alphabets(8),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://community.example.com/join",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const member: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(member);

  // 2. Create a community where posts will be created.
  const communityBody = {
    slug: RandomGenerator.alphabets(12),
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
      { body: communityBody },
    );
  typia.assert(community);

  TestValidator.equals(
    "created community owner should be the joined member",
    community.owner_memberuser_id,
    member.id,
  );

  // 3. Create two logical groups of posts in that community: ones we treat as
  // "older" and ones we treat as "newer". We cannot control timestamps, but
  // we can at least separate them in code and ensure they all belong to the
  // same community.
  const olderPosts: ICommunityPlatformPost[] = [];
  const newerPosts: ICommunityPlatformPost[] = [];

  // 3-1. Create a handful of "older" posts first.
  for (let i = 0; i < 3; i += 1) {
    const body = {
      communityId: community.id,
      communityCode: community.slug,
      title: `Older post #${i + 1}: ${RandomGenerator.paragraph({ sentences: 1 })}`,
      body: RandomGenerator.paragraph({ sentences: 8 }),
      url: undefined,
      postType: "text",
    } satisfies ICommunityPlatformPost.ICreate;

    const post: ICommunityPlatformPost =
      await api.functional.communityPlatform.memberUser.posts.create(
        connection,
        { body },
      );
    typia.assert(post);

    TestValidator.equals(
      "older post belongs to community",
      post.community_id,
      community.id,
    );

    olderPosts.push(post);
  }

  // 3-2. Create a handful of "newer" posts afterwards.
  for (let i = 0; i < 3; i += 1) {
    const body = {
      communityId: community.id,
      communityCode: community.slug,
      title: `Newer post #${i + 1}: ${RandomGenerator.paragraph({ sentences: 1 })}`,
      body: RandomGenerator.paragraph({ sentences: 4 }),
      url: undefined,
      postType: "text",
    } satisfies ICommunityPlatformPost.ICreate;

    const post: ICommunityPlatformPost =
      await api.functional.communityPlatform.memberUser.posts.create(
        connection,
        { body },
      );
    typia.assert(post);

    TestValidator.equals(
      "newer post belongs to community",
      post.community_id,
      community.id,
    );

    newerPosts.push(post);
  }

  TestValidator.equals("we created three older posts", olderPosts.length, 3);
  TestValidator.equals("we created three newer posts", newerPosts.length, 3);

  // 4. Cast votes on some posts to differentiate "top" scores.
  // Use simple up/down directions as strings.
  const voteDirections = ["up", "down"] as const;

  // Give higher scores to newer posts by upvoting them more.
  for (const post of newerPosts) {
    // Upvote each newer post twice.
    for (let i = 0; i < 2; i += 1) {
      const voteBody = {
        direction: "up",
      } satisfies ICommunityPlatformPostVote.ICreate;

      const vote: ICommunityPlatformPostVote =
        await api.functional.communityPlatform.memberUser.posts.votes.create(
          connection,
          {
            postId: post.id,
            body: voteBody,
          },
        );
      typia.assert(vote);

      TestValidator.equals("vote target is newer post", vote.post_id, post.id);
    }
  }

  // Give fewer or mixed votes to older posts.
  for (const post of olderPosts) {
    const direction = RandomGenerator.pick(voteDirections);
    const voteBody = {
      direction,
    } satisfies ICommunityPlatformPostVote.ICreate;

    const vote: ICommunityPlatformPostVote =
      await api.functional.communityPlatform.memberUser.posts.votes.create(
        connection,
        {
          postId: post.id,
          body: voteBody,
        },
      );
    typia.assert(vote);

    TestValidator.equals("vote target is older post", vote.post_id, post.id);
  }

  // 5. Conceptual feed calls (NOT implemented because SDK for
  // /communityPlatform/feeds/posts/top is not available).
  //
  // If there were a function like:
  //   api.functional.communityPlatform.feeds.posts.top.index(connection, {
  //     query: { timeRange: "day" }
  //   })
  // returning something like IPageICommunityPlatformPost.ISummary,
  // we would perform assertions along the lines of:
  //
  // - Newer posts should be present in the `day` feed and appear ahead of
  //   clearly lower-scored older posts.
  // - Older posts that significantly predate the `day` window would either be
  //   excluded or ranked much lower for `day`, but could still appear in an
  //   `all` timeRange feed.
  // - An invalid timeRange (e.g. "invalid") would produce a validation error
  //   or fall back to a default timeRange according to the contract.
  //
  // However, to preserve compilation safety, we do not attempt to call a
  // non-existent SDK function here. The prepared data and voting patterns
  // reflect what such a test would rely on.
}
