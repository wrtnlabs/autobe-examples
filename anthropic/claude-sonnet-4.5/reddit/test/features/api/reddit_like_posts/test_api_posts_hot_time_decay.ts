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
 * Validates time decay in hot algorithm with equal vote counts.
 *
 * This test verifies that the hot algorithm correctly applies exponential time
 * decay to post rankings by creating multiple posts with identical vote scores
 * but different creation times. The test confirms that newer posts rank higher
 * than older posts when vote counts are equal, preventing old content from
 * permanently dominating the feed.
 *
 * Test workflow:
 *
 * 1. Create member account for authoring posts
 * 2. Create community to host the posts
 * 3. Create first post (older post)
 * 4. Wait to create time separation
 * 5. Create second post (newer post)
 * 6. Apply identical upvotes to both posts
 * 7. Retrieve hot posts feed
 * 8. Verify newer post ranks higher than older post despite equal votes
 */
export async function test_api_posts_hot_time_decay(
  connection: api.IConnection,
) {
  // Step 1: Create member account
  const memberData = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePass123!",
  } satisfies IRedditLikeMember.ICreate;

  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 2: Create community for posts
  const communityData = {
    code: RandomGenerator.alphaNumeric(10).toLowerCase(),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    privacy_type: "public",
    allow_text_posts: true,
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
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IRedditLikePost.ICreate;

  const olderPost: IRedditLikePost =
    await api.functional.redditLike.member.posts.create(connection, {
      body: olderPostData,
    });
  typia.assert(olderPost);

  // Step 4: Wait to create time separation (simulate time passing)
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Step 5: Create second post (newer post)
  const newerPostData = {
    community_id: community.id,
    type: "text",
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IRedditLikePost.ICreate;

  const newerPost: IRedditLikePost =
    await api.functional.redditLike.member.posts.create(connection, {
      body: newerPostData,
    });
  typia.assert(newerPost);

  // Step 6: Apply identical upvotes to both posts (vote_value: 1 for upvote)
  const upvoteData = {
    vote_value: 1,
  } satisfies IRedditLikePostVote.ICreate;

  const olderPostVote: IRedditLikePostVote =
    await api.functional.redditLike.member.posts.votes.create(connection, {
      postId: olderPost.id,
      body: upvoteData,
    });
  typia.assert(olderPostVote);

  const newerPostVote: IRedditLikePostVote =
    await api.functional.redditLike.member.posts.votes.create(connection, {
      postId: newerPost.id,
      body: upvoteData,
    });
  typia.assert(newerPostVote);

  // Step 7: Retrieve hot posts feed filtered by community
  const hotPostsRequest = {
    page: 1,
    limit: 10,
    community_id: community.id,
  } satisfies IRedditLikePost.IHotRequest;

  const hotPostsPage: IPageIRedditLikePost.ISummary =
    await api.functional.redditLike.posts.hot(connection, {
      body: hotPostsRequest,
    });
  typia.assert(hotPostsPage);

  // Step 8: Verify newer post ranks higher than older post
  TestValidator.predicate(
    "hot posts should contain both test posts",
    hotPostsPage.data.length >= 2,
  );

  const newerPostIndex = hotPostsPage.data.findIndex(
    (post) => post.id === newerPost.id,
  );
  const olderPostIndex = hotPostsPage.data.findIndex(
    (post) => post.id === olderPost.id,
  );

  TestValidator.predicate(
    "newer post should be found in results",
    newerPostIndex !== -1,
  );

  TestValidator.predicate(
    "older post should be found in results",
    olderPostIndex !== -1,
  );

  TestValidator.predicate(
    "newer post should rank higher (lower index) than older post with equal votes",
    newerPostIndex < olderPostIndex,
  );
}
