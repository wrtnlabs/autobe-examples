import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityForumAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumAuthorizationToken";
import type { ICommunityForumCommunityGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityGroup";
import type { ICommunityForumCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityPost";
import type { ICommunityForumCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityUser";
import type { ICommunityForumPostComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumPostComment";
import type { ICommunityForumPostCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumPostCommentVote";

export async function test_api_comment_vote_removal_by_user(
  connection: api.IConnection,
) {
  // Step 1: Create a user to authenticate and create content
  const userJoin = {
    email: `${RandomGenerator.alphabets(10)}@test.com`,
    password: "password123",
    username: RandomGenerator.alphabets(8),
  } satisfies ICommunityForumCommunityUser.IJoin;

  const user: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: userJoin,
    });
  typia.assert(user);

  // Step 2: Create another user to vote on the comment
  const voterJoin = {
    email: `${RandomGenerator.alphabets(10)}@test.com`,
    password: "password123",
    username: RandomGenerator.alphabets(8),
  } satisfies ICommunityForumCommunityUser.IJoin;

  const voter: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: voterJoin,
    });
  typia.assert(voter);

  // Step 3: Create a community
  const communityCreate = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphabets(10),
    title: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    rules: RandomGenerator.paragraph({ sentences: 3 }),
    privacy_level: "public",
    status: "active",
  } satisfies ICommunityForumCommunityGroup.ICreate;

  const community: ICommunityForumCommunityGroup =
    await api.functional.communityForum.user.communities.create(connection, {
      body: communityCreate,
    });
  typia.assert(community);

  // Step 4: Create a post in the community
  const postCreate = {
    community_forum_community_id: community.id,
    title: RandomGenerator.name(4),
    type: "text",
    body: RandomGenerator.paragraph({ sentences: 10 }),
  } satisfies ICommunityForumCommunityPost.ICreate;

  const post: ICommunityForumCommunityPost =
    await api.functional.communityForum.user.posts.create(connection, {
      body: postCreate,
    });
  typia.assert(post);

  // Step 5: Create a comment on the post
  const commentCreate = {
    body: RandomGenerator.paragraph({ sentences: 5 }),
    href: "http://localhost/test",
    referrer: "http://localhost/referrer",
  } satisfies ICommunityForumPostComment.ICreate;

  const comment: ICommunityForumPostComment =
    await api.functional.communityForum.user.posts.comments.create(connection, {
      postId: post.id,
      body: commentCreate,
    });
  typia.assert(comment);

  // Step 6: Create a vote on the comment (using voter connection)
  // Switch to voter connection
  const voterConnection: api.IConnection = {
    ...connection,
    headers: {
      ...(connection.headers ?? {}),
      Authorization: `Bearer ${voter.token.access}`,
    },
  };

  const voteCreate = {
    is_upvote: true,
  } satisfies ICommunityForumPostCommentVote.ICreate;

  const vote: ICommunityForumPostCommentVote =
    await api.functional.communityForum.user.comments.votes.create(
      voterConnection,
      {
        commentId: comment.id,
        body: voteCreate,
      },
    );
  typia.assert(vote);

  // Step 7: Verify the vote exists by checking the vote data
  TestValidator.predicate(
    "vote should be created successfully",
    () => vote.is_upvote === true,
  );

  // Step 8: Remove the vote (using voter connection)
  await api.functional.communityForum.user.comments.votes.erase(
    voterConnection,
    {
      commentId: comment.id,
      voteId: vote.id,
    },
  );

  // Step 9: Attempt to delete the same vote again - should still succeed (idempotent)
  await api.functional.communityForum.user.comments.votes.erase(
    voterConnection,
    {
      commentId: comment.id,
      voteId: vote.id,
    },
  );

  // Step 10: Verify that we can create a new vote after deletion
  const newVoteCreate = {
    is_upvote: false, // Different from the original vote
  } satisfies ICommunityForumPostCommentVote.ICreate;

  const newVote: ICommunityForumPostCommentVote =
    await api.functional.communityForum.user.comments.votes.create(
      voterConnection,
      {
        commentId: comment.id,
        body: newVoteCreate,
      },
    );
  typia.assert(newVote);

  TestValidator.predicate(
    "new vote should be created successfully after deletion",
    () => newVote.is_upvote === false,
  );
}
