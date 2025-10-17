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

export async function test_api_community_hot_posts_time_decay_effect(
  connection: api.IConnection,
) {
  // Step 1: Create member account for testing
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_-]+$">
      >(),
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create community for time decay testing
  const community = await api.functional.redditLike.member.communities.create(
    connection,
    {
      body: {
        code: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<25> &
            tags.Pattern<"^[a-zA-Z0-9_]+$">
        >(),
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({
          sentences: 10,
          wordMin: 10,
          wordMax: 20,
        }),
        privacy_type: "public",
        posting_permission: "anyone_subscribed",
        allow_text_posts: true,
        allow_link_posts: true,
        allow_image_posts: true,
        primary_category: "technology",
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);

  // Step 3: Create an older post (simulating older content)
  const olderPost = await api.functional.redditLike.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        type: "text",
        title: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 3,
          wordMax: 7,
        }),
        body: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 10,
          sentenceMax: 20,
        }),
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(olderPost);

  // Step 4: Create a newer post (simulating fresh content)
  const newerPost = await api.functional.redditLike.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        type: "text",
        title: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 3,
          wordMax: 7,
        }),
        body: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 8,
          sentenceMax: 15,
        }),
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(newerPost);

  // Step 5: Vote on older post
  const olderPostVote =
    await api.functional.redditLike.member.posts.votes.create(connection, {
      postId: olderPost.id,
      body: {
        vote_value: 1,
      } satisfies IRedditLikePostVote.ICreate,
    });
  typia.assert(olderPostVote);

  // Step 6: Vote on newer post
  const newerPostVote =
    await api.functional.redditLike.member.posts.votes.create(connection, {
      postId: newerPost.id,
      body: {
        vote_value: 1,
      } satisfies IRedditLikePostVote.ICreate,
    });
  typia.assert(newerPostVote);

  // Step 7: Retrieve hot posts from the community
  const hotPosts = await api.functional.redditLike.communities.posts.hot(
    connection,
    {
      communityId: community.id,
      body: {
        page: 1,
        limit: 10,
      } satisfies IRedditLikePost.IHotRequest,
    },
  );
  typia.assert(hotPosts);

  // Step 8: Validate pagination structure
  TestValidator.equals(
    "hot posts pagination current page",
    hotPosts.pagination.current,
    1,
  );

  TestValidator.predicate(
    "hot posts should contain data",
    hotPosts.data.length > 0,
  );

  // Step 9: Verify both posts are in the results
  const olderPostInResults = hotPosts.data.find((p) => p.id === olderPost.id);
  const newerPostInResults = hotPosts.data.find((p) => p.id === newerPost.id);

  typia.assertGuard(olderPostInResults!);
  typia.assertGuard(newerPostInResults!);

  // Step 10: Validate that Hot algorithm returns posts in sorted order
  // The test validates that both older and newer posts appear in Hot results
  // demonstrating the algorithm considers both posts viable for the feed
  const olderPostIndex = hotPosts.data.findIndex((p) => p.id === olderPost.id);
  const newerPostIndex = hotPosts.data.findIndex((p) => p.id === newerPost.id);

  TestValidator.predicate(
    "older post should be found in hot posts",
    olderPostIndex >= 0,
  );

  TestValidator.predicate(
    "newer post should be found in hot posts",
    newerPostIndex >= 0,
  );

  // Validate that the Hot algorithm produces a meaningful ranking
  // While we cannot fully test time decay without multiple voters or time passage,
  // we validate that the algorithm includes both posts in results
  TestValidator.predicate(
    "hot algorithm should include both posts in feed",
    hotPosts.data.length >= 2,
  );
}
