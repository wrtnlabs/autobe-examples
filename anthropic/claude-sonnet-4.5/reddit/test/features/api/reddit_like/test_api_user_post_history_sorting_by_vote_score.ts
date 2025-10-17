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
import type { IRedditLikeUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeUser";

/**
 * Test retrieving user post history sorted by vote score to discover most
 * popular content.
 *
 * This test validates the user post history sorting functionality that allows
 * users to discover a member's most popular and well-received content based on
 * vote scores.
 *
 * Workflow:
 *
 * 1. Create member account as the post author
 * 2. Create community to host the posts
 * 3. Create multiple posts with different content
 * 4. Create additional voter accounts and cast votes to establish varying vote
 *    scores
 * 5. Retrieve post history with sort_by='top' parameter
 * 6. Verify posts are returned in descending vote score order (highest first)
 */
export async function test_api_user_post_history_sorting_by_vote_score(
  connection: api.IConnection,
) {
  // Step 1: Create member account as post author
  const authorMember: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.name(1) + RandomGenerator.alphaNumeric(4),
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.MinLength<8>>(),
      } satisfies IRedditLikeMember.ICreate,
    });
  typia.assert(authorMember);

  // Step 2: Create community to host posts
  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: {
        code: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditLikeCommunity.ICreate,
    });
  typia.assert(community);

  // Step 3: Create multiple posts with different content
  const post1: IRedditLikePost =
    await api.functional.redditLike.member.posts.create(connection, {
      body: {
        community_id: community.id,
        type: "text",
        title: RandomGenerator.paragraph({ sentences: 1 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditLikePost.ICreate,
    });
  typia.assert(post1);

  const post2: IRedditLikePost =
    await api.functional.redditLike.member.posts.create(connection, {
      body: {
        community_id: community.id,
        type: "text",
        title: RandomGenerator.paragraph({ sentences: 1 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditLikePost.ICreate,
    });
  typia.assert(post2);

  const post3: IRedditLikePost =
    await api.functional.redditLike.member.posts.create(connection, {
      body: {
        community_id: community.id,
        type: "text",
        title: RandomGenerator.paragraph({ sentences: 1 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditLikePost.ICreate,
    });
  typia.assert(post3);

  // Step 4: Create voter accounts and cast votes to establish varying vote scores
  // Post 1: 5 upvotes (highest score)
  await ArrayUtil.asyncRepeat(5, async () => {
    const voter: IRedditLikeMember.IAuthorized =
      await api.functional.auth.member.join(connection, {
        body: {
          username: RandomGenerator.name(1) + RandomGenerator.alphaNumeric(4),
          email: typia.random<string & tags.Format<"email">>(),
          password: typia.random<string & tags.MinLength<8>>(),
        } satisfies IRedditLikeMember.ICreate,
      });
    typia.assert(voter);

    const vote: IRedditLikePostVote =
      await api.functional.redditLike.member.posts.votes.create(connection, {
        postId: post1.id,
        body: {
          vote_value: 1,
        } satisfies IRedditLikePostVote.ICreate,
      });
    typia.assert(vote);
  });

  // Post 2: 3 upvotes (medium score)
  await ArrayUtil.asyncRepeat(3, async () => {
    const voter: IRedditLikeMember.IAuthorized =
      await api.functional.auth.member.join(connection, {
        body: {
          username: RandomGenerator.name(1) + RandomGenerator.alphaNumeric(4),
          email: typia.random<string & tags.Format<"email">>(),
          password: typia.random<string & tags.MinLength<8>>(),
        } satisfies IRedditLikeMember.ICreate,
      });
    typia.assert(voter);

    const vote: IRedditLikePostVote =
      await api.functional.redditLike.member.posts.votes.create(connection, {
        postId: post2.id,
        body: {
          vote_value: 1,
        } satisfies IRedditLikePostVote.ICreate,
      });
    typia.assert(vote);
  });

  // Post 3: 1 upvote (lowest score)
  const voter3: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.name(1) + RandomGenerator.alphaNumeric(4),
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.MinLength<8>>(),
      } satisfies IRedditLikeMember.ICreate,
    });
  typia.assert(voter3);

  const vote3: IRedditLikePostVote =
    await api.functional.redditLike.member.posts.votes.create(connection, {
      postId: post3.id,
      body: {
        vote_value: 1,
      } satisfies IRedditLikePostVote.ICreate,
    });
  typia.assert(vote3);

  // Step 5: Retrieve post history sorted by vote score (top posts first)
  const postHistory: IPageIRedditLikePost.ISummary =
    await api.functional.redditLike.users.posts(connection, {
      userId: authorMember.id,
      body: {
        sort_by: "top",
      } satisfies IRedditLikeUser.IPostsRequest,
    });
  typia.assert(postHistory);

  // Step 6: Verify posts are returned in descending vote score order
  TestValidator.predicate(
    "post history should contain all 3 posts",
    postHistory.data.length === 3,
  );

  TestValidator.equals(
    "first post should be post1 with highest vote score",
    postHistory.data[0].id,
    post1.id,
  );

  TestValidator.equals(
    "second post should be post2 with medium vote score",
    postHistory.data[1].id,
    post2.id,
  );

  TestValidator.equals(
    "third post should be post3 with lowest vote score",
    postHistory.data[2].id,
    post3.id,
  );
}
