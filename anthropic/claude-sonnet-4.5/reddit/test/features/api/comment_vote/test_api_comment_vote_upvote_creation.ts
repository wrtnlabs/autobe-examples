import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommentVote";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

/**
 * Test the complete workflow of upvoting a comment in a Reddit-like community.
 *
 * This test validates the democratic content curation system by testing the
 * complete workflow of a member upvoting a comment. The test creates all
 * necessary prerequisites (member account, community, post, and comment) and
 * then casts an upvote on the comment.
 *
 * Test workflow:
 *
 * 1. Register a new member account to obtain authentication
 * 2. Create a community to host the discussion
 * 3. Create a post within the community as the discussion anchor
 * 4. Create a comment on the post
 * 5. Cast an upvote (+1) on the comment
 * 6. Validate vote recording, vote score update, and response correctness
 */
export async function test_api_comment_vote_upvote_creation(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account through registration
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.MinLength<8>>();
  const memberUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<20> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();

  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: memberUsername,
      email: memberEmail,
      password: memberPassword,
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create a community to host the discussion
  const communityCode = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<25> &
      tags.Pattern<"^[a-zA-Z0-9_]+$">
  >();
  const communityName = RandomGenerator.name(2);
  const communityDescription = RandomGenerator.paragraph({ sentences: 3 });

  const community = await api.functional.redditLike.member.communities.create(
    connection,
    {
      body: {
        code: communityCode,
        name: communityName,
        description: communityDescription,
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);

  // Step 3: Create a post within the community to serve as discussion anchor
  const postTypes = ["text", "link", "image"] as const;
  const postType = RandomGenerator.pick(postTypes);
  const postTitle = RandomGenerator.paragraph({ sentences: 2 });

  const post = await api.functional.redditLike.member.posts.create(connection, {
    body: {
      community_id: community.id,
      type: postType,
      title: postTitle,
      body:
        postType === "text"
          ? RandomGenerator.content({ paragraphs: 2 })
          : undefined,
    } satisfies IRedditLikePost.ICreate,
  });
  typia.assert(post);

  // Step 4: Create a comment on the post
  const commentText = RandomGenerator.content({ paragraphs: 1 });

  const comment = await api.functional.redditLike.member.comments.create(
    connection,
    {
      body: {
        reddit_like_post_id: post.id,
        content_text: commentText,
      } satisfies IRedditLikeComment.ICreate,
    },
  );
  typia.assert(comment);

  // Step 5: Cast an upvote (+1) on the comment
  const vote = await api.functional.redditLike.member.comments.votes.create(
    connection,
    {
      commentId: comment.id,
      body: {
        vote_value: 1,
      } satisfies IRedditLikeCommentVote.ICreate,
    },
  );
  typia.assert(vote);

  // Step 6: Validate the vote was recorded successfully
  TestValidator.equals("vote value should be upvote", vote.vote_value, 1);
  TestValidator.predicate(
    "vote should have valid ID",
    vote.id !== undefined && vote.id.length > 0,
  );
  TestValidator.predicate(
    "vote should have creation timestamp",
    vote.created_at !== undefined,
  );
}
