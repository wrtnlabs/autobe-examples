import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikePostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostVote";

/**
 * Test vote change from upvote to downvote on a post.
 *
 * This test validates the vote state transition workflow where a member changes
 * their vote from upvote to downvote on the same post, ensuring proper vote
 * replacement logic and system integrity.
 *
 * Workflow:
 *
 * 1. Create first member as post author
 * 2. Post author creates a community
 * 3. Post author creates a post in the community
 * 4. Create second member as voter
 * 5. Voter casts initial upvote (+1)
 * 6. Voter changes vote to downvote (-1)
 * 7. Validate vote replacement (only one vote per member per post)
 */
export async function test_api_member_vote_change_from_upvote_to_downvote(
  connection: api.IConnection,
) {
  // Step 1: Create first member (post author)
  const authorEmail = typia.random<string & tags.Format<"email">>();
  const author = await api.functional.auth.member.join(connection, {
    body: {
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_-]+$">
      >(),
      email: authorEmail,
      password: typia.random<string & tags.MinLength<8>>(),
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(author);

  // Step 2: Post author creates a community
  const community = await api.functional.redditLike.member.communities.create(
    connection,
    {
      body: {
        code: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<25> &
            tags.Pattern<"^[a-zA-Z0-9_-]+$">
        >(),
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);

  // Step 3: Post author creates a post
  const post = await api.functional.redditLike.member.posts.create(connection, {
    body: {
      community_id: community.id,
      type: "text",
      title: RandomGenerator.paragraph({ sentences: 3 }),
      body: RandomGenerator.content({ paragraphs: 2 }),
    } satisfies IRedditLikePost.ICreate,
  });
  typia.assert(post);

  // Step 4: Create second member (voter)
  const voterEmail = typia.random<string & tags.Format<"email">>();
  const voter = await api.functional.auth.member.join(connection, {
    body: {
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_-]+$">
      >(),
      email: voterEmail,
      password: typia.random<string & tags.MinLength<8>>(),
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(voter);

  // Step 5: Voter casts initial upvote (+1)
  const upvote = await api.functional.redditLike.member.posts.votes.create(
    connection,
    {
      postId: post.id,
      body: {
        vote_value: 1,
      } satisfies IRedditLikePostVote.ICreate,
    },
  );
  typia.assert(upvote);
  TestValidator.equals("initial vote is upvote", upvote.vote_value, 1);

  // Step 6: Voter changes vote to downvote (-1)
  const downvote = await api.functional.redditLike.member.posts.votes.create(
    connection,
    {
      postId: post.id,
      body: {
        vote_value: -1,
      } satisfies IRedditLikePostVote.ICreate,
    },
  );
  typia.assert(downvote);

  // Step 7: Validate vote replacement
  TestValidator.equals("vote changed to downvote", downvote.vote_value, -1);
  TestValidator.equals("same vote record updated", downvote.id, upvote.id);
  TestValidator.predicate(
    "vote timestamp updated",
    new Date(downvote.updated_at).getTime() >=
      new Date(upvote.created_at).getTime(),
  );
}
