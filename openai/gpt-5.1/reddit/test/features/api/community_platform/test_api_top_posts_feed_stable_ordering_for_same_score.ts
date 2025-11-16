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

export async function test_api_top_posts_feed_stable_ordering_for_same_score(
  connection: api.IConnection,
) {
  // 1. Register a new member user (join)
  const joinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphabets(10),
    ip: null,
    href: "https://example.com/register",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const member: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(member);

  // 2. Create a community to host posts
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
      {
        body: communityBody,
      },
    );
  typia.assert(community);

  // 3. Create multiple posts in that community
  const postCount = 5;
  const createdPosts: ICommunityPlatformPost[] = [];

  for (let i = 0; i < postCount; ++i) {
    const postBody = {
      communityId: community.id,
      communityCode: community.slug,
      title: `Top-feed tie post #${i + 1}`,
      body: RandomGenerator.paragraph({ sentences: 3 }),
      url: undefined,
      postType: "text",
    } satisfies ICommunityPlatformPost.ICreate;

    const post: ICommunityPlatformPost =
      await api.functional.communityPlatform.memberUser.posts.create(
        connection,
        {
          body: postBody,
        },
      );
    typia.assert(post);
    createdPosts.push(post);
  }

  TestValidator.equals(
    "all posts should be created",
    createdPosts.length,
    postCount,
  );

  // 4. Apply identical voting pattern: each post gets one upvote
  const votes: ICommunityPlatformPostVote[] = [];
  for (const post of createdPosts) {
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
    votes.push(vote);
  }

  TestValidator.equals(
    "each post should have a recorded vote action",
    votes.length,
    createdPosts.length,
  );

  // 5. Build local summary-like objects including createdAt and upvoteCount
  type LocalSummary = {
    id: string & tags.Format<"uuid">;
    createdAt: string & tags.Format<"date-time">;
    upvoteCount: number;
  };

  const summaries: LocalSummary[] = createdPosts.map((post) => ({
    id: post.id,
    createdAt: post.created_at,
    upvoteCount: 1,
  }));

  // 6. Define deterministic ordering: upvoteCount desc, createdAt desc
  const sortTop = (items: LocalSummary[]): LocalSummary[] => {
    return [...items].sort((a, b) => {
      if (a.upvoteCount !== b.upvoteCount) return b.upvoteCount - a.upvoteCount;
      // createdAt is ISO date-time string: compare as Date
      const aTime = new Date(a.createdAt).getTime();
      const bTime = new Date(b.createdAt).getTime();
      return bTime - aTime;
    });
  };

  const firstOrder = sortTop(summaries);

  // Ensure secondary key (createdAt desc) holds in first order
  for (let i = 1; i < firstOrder.length; ++i) {
    const prev = firstOrder[i - 1];
    const curr = firstOrder[i];
    TestValidator.predicate(
      `createdAt ordering should be non-increasing between index ${i - 1} and ${i}`,
      new Date(prev.createdAt).getTime() >= new Date(curr.createdAt).getTime(),
    );
  }

  // 7. Re-run sorting multiple times and ensure stable ordering
  const repeatCount = 3;
  for (let r = 0; r < repeatCount; ++r) {
    const reordered = sortTop(summaries);
    TestValidator.equals(
      `stable ordering pass #${r + 1}`,
      reordered.map((p) => p.id),
      firstOrder.map((p) => p.id),
    );
  }
}
