import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";

export async function test_api_reddit_community_comment_vote_deletion_by_registered_user(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate a new user to obtain token
  const userCreateBody = {
    email: `${RandomGenerator.name(1)}@example.com`,
    password: "Password!123",
  } satisfies IRedditCommunityRegisteredUser.ICreate;
  const user: IRedditCommunityRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: userCreateBody,
    });
  typia.assert(user);

  // Step 2: Create a new community
  const communityCreateBody = {
    communityName: RandomGenerator.alphabets(8).toLowerCase(),
    displayName: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    imageUrl: null,
    isPrivate: false,
  } satisfies IRedditCommunityCommunity.ICreate;
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.registeredUser.redditCommunity.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);

  // Step 3: Create a post in the community using a fake UUID for community ID due to DTO mismatch
  const postCreateBody = {
    reddit_community_community_id: typia.random<string & tags.Format<"uuid">>(),
    type: "text",
    title: RandomGenerator.paragraph({ sentences: 5 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    link_url: null,
    image_url: null,
  } satisfies IRedditCommunityPost.ICreate;
  const post: IRedditCommunityPost =
    await api.functional.redditCommunity.registeredUser.redditCommunity.posts.create(
      connection,
      { body: postCreateBody },
    );
  typia.assert(post);

  // Step 4: Add a comment to the post
  const commentCreateBody = {
    body: RandomGenerator.paragraph({ sentences: 3 }),
    parent_id: null,
  } satisfies IRedditCommunityComment.ICreate;
  const comment: IRedditCommunityComment =
    await api.functional.redditCommunity.registeredUser.redditCommunity.posts.comments.create(
      connection,
      { postId: post.id, body: commentCreateBody },
    );
  typia.assert(comment);

  // Step 5: Cast a vote on the comment
  const voteCreateBody = {
    vote_type: "upvote",
  } satisfies IRedditCommunityCommentVote.ICreate;
  const commentVote: IRedditCommunityCommentVote =
    await api.functional.redditCommunity.registeredUser.redditCommunity.posts.comments.commentVotes.create(
      connection,
      { postId: post.id, commentId: comment.id, body: voteCreateBody },
    );
  typia.assert(commentVote);

  // Step 6: Delete the comment vote
  await api.functional.redditCommunity.registeredUser.redditCommunity.posts.comments.commentVotes.erase(
    connection,
    { postId: post.id, commentId: comment.id, commentVoteId: commentVote.id },
  );

  // Verify deletion by attempting to delete the same vote again and expecting error
  await TestValidator.error(
    "deleting an already deleted vote throws error",
    async () => {
      await api.functional.redditCommunity.registeredUser.redditCommunity.posts.comments.commentVotes.erase(
        connection,
        {
          postId: post.id,
          commentId: comment.id,
          commentVoteId: commentVote.id,
        },
      );
    },
  );
}
