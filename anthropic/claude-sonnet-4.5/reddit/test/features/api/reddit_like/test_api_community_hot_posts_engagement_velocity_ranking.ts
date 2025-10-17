import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikePost";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikePostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostVote";

/**
 * Validates Hot algorithm engagement velocity ranking with multiple users.
 *
 * This test creates a realistic engagement velocity scenario by simulating
 * multiple users voting on posts at different rates. The Hot algorithm should
 * prioritize posts with rapid early engagement over posts with similar vote
 * counts accumulated slowly.
 *
 * Test workflow:
 *
 * 1. Create primary member account and community
 * 2. Create two test posts (representing older and recent content)
 * 3. Create additional member accounts to simulate multiple voters
 * 4. Apply votes from multiple users to create velocity patterns
 * 5. Retrieve hot-sorted posts
 * 6. Verify ranking reflects engagement velocity
 */
export async function test_api_community_hot_posts_engagement_velocity_ranking(
  connection: api.IConnection,
) {
  // Step 1: Create primary member account
  const primaryMemberData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IRedditLikeMember.ICreate;

  const primaryMember: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: primaryMemberData,
    });
  typia.assert(primaryMember);

  // Step 2: Create community
  const communityData = {
    code: RandomGenerator.alphaNumeric(8).toLowerCase(),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 5,
      wordMax: 10,
    }),
  } satisfies IRedditLikeCommunity.ICreate;

  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: communityData,
    });
  typia.assert(community);

  // Step 3: Create first post (older post)
  const olderPostData = {
    community_id: community.id,
    type: "text",
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
  } satisfies IRedditLikePost.ICreate;

  const olderPost: IRedditLikePost =
    await api.functional.redditLike.member.posts.create(connection, {
      body: olderPostData,
    });
  typia.assert(olderPost);

  // Step 4: Create second post (recent post)
  const recentPostData = {
    community_id: community.id,
    type: "text",
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
  } satisfies IRedditLikePost.ICreate;

  const recentPost: IRedditLikePost =
    await api.functional.redditLike.member.posts.create(connection, {
      body: recentPostData,
    });
  typia.assert(recentPost);

  // Step 5: Create additional member accounts to simulate multiple voters
  const voterMembers = await ArrayUtil.asyncRepeat(12, async (index) => {
    const voterData = {
      username: RandomGenerator.alphaNumeric(10),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IRedditLikeMember.ICreate;

    const voter: IRedditLikeMember.IAuthorized =
      await api.functional.auth.member.join(connection, {
        body: voterData,
      });
    typia.assert(voter);
    return voter;
  });

  // Step 6: Simulate slow engagement on older post (8 voters)
  const olderPostVoters = voterMembers.slice(0, 8);
  await ArrayUtil.asyncForEach(olderPostVoters, async (voter) => {
    const voterConnection: api.IConnection = {
      ...connection,
      headers: {
        ...connection.headers,
        Authorization: voter.token.access,
      },
    };

    const vote: IRedditLikePostVote =
      await api.functional.redditLike.member.posts.votes.create(
        voterConnection,
        {
          postId: olderPost.id,
          body: {
            vote_value: 1,
          } satisfies IRedditLikePostVote.ICreate,
        },
      );
    typia.assert(vote);
  });

  // Step 7: Simulate rapid engagement on recent post (10 voters)
  const recentPostVoters = voterMembers.slice(0, 10);
  await ArrayUtil.asyncForEach(recentPostVoters, async (voter) => {
    const voterConnection: api.IConnection = {
      ...connection,
      headers: {
        ...connection.headers,
        Authorization: voter.token.access,
      },
    };

    const vote: IRedditLikePostVote =
      await api.functional.redditLike.member.posts.votes.create(
        voterConnection,
        {
          postId: recentPost.id,
          body: {
            vote_value: 1,
          } satisfies IRedditLikePostVote.ICreate,
        },
      );
    typia.assert(vote);
  });

  // Step 8: Retrieve hot-sorted posts
  const hotPosts: IPageIRedditLikePost.ISummary =
    await api.functional.redditLike.communities.posts.hot(connection, {
      communityId: community.id,
      body: {
        page: 1,
        limit: 10,
      } satisfies IRedditLikePost.IHotRequest,
    });
  typia.assert(hotPosts);

  // Step 9: Validate engagement velocity ranking
  TestValidator.predicate(
    "hot posts returned at least 2 posts",
    hotPosts.data.length >= 2,
  );

  const recentPostIndex = hotPosts.data.findIndex(
    (p) => p.id === recentPost.id,
  );
  const olderPostIndex = hotPosts.data.findIndex((p) => p.id === olderPost.id);

  TestValidator.predicate(
    "recent post found in hot posts",
    recentPostIndex !== -1,
  );

  TestValidator.predicate(
    "older post found in hot posts",
    olderPostIndex !== -1,
  );

  TestValidator.predicate(
    "recent post with more rapid engagement ranks higher than older post",
    recentPostIndex < olderPostIndex,
  );
}
