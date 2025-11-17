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

export async function test_api_redditcommunity_comment_vote_update_by_registered_user(
  connection: api.IConnection,
) {
  // 1. Authenticate as a registered user
  const user1: IRedditCommunityRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        email: `user1.${RandomGenerator.alphaNumeric(6)}@example.com`,
        password: "P@ssw0rd",
      } satisfies IRedditCommunityRegisteredUser.ICreate,
    });
  typia.assert(user1);

  // 2. Create a community
  const communityBody = {
    communityName: RandomGenerator.alphabets(8).toLowerCase().slice(0, 8),
    displayName: `Test Community ${RandomGenerator.alphaNumeric(4)}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
    imageUrl: null,
    isPrivate: false,
  } satisfies IRedditCommunityCommunity.ICreate;
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.registeredUser.redditCommunity.communities.create(
      connection,
      {
        body: communityBody,
      },
    );
  typia.assert(community);

  // Because post expects community id as uuid string, generate a communityId to comply
  const communityId = typia.random<string & tags.Format<"uuid">>();

  // 3. Create a post within the community
  const postBody: IRedditCommunityPost.ICreate = {
    reddit_community_community_id: communityId,
    type: "text",
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IRedditCommunityPost.ICreate;

  const post: IRedditCommunityPost =
    await api.functional.redditCommunity.registeredUser.redditCommunity.posts.create(
      connection,
      {
        body: postBody,
      },
    );
  typia.assert(post);

  // 4. Create a comment to vote on
  const commentBody = {
    body: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IRedditCommunityComment.ICreate;

  const comment: IRedditCommunityComment =
    await api.functional.redditCommunity.registeredUser.redditCommunity.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: commentBody,
      },
    );
  typia.assert(comment);

  // 5. Create initial comment vote
  const voteCreateBody = {
    vote_type: "upvote",
  } satisfies IRedditCommunityCommentVote.ICreate;

  const commentVote: IRedditCommunityCommentVote =
    await api.functional.redditCommunity.registeredUser.redditCommunity.posts.comments.commentVotes.create(
      connection,
      {
        postId: post.id,
        commentId: comment.id,
        body: voteCreateBody,
      },
    );
  typia.assert(commentVote);

  // 6. Update the vote type (only owner can update)
  const voteUpdateBody = {
    vote_type: "downvote",
  } satisfies IRedditCommunityCommentVote.IUpdate;

  const updatedVote: IRedditCommunityCommentVote =
    await api.functional.redditCommunity.registeredUser.redditCommunity.posts.comments.commentVotes.update(
      connection,
      {
        postId: post.id,
        commentId: comment.id,
        commentVoteId: commentVote.id,
        body: voteUpdateBody,
      },
    );
  typia.assert(updatedVote);

  // 7. Validate that the update applied correctly
  TestValidator.equals(
    "updated vote type should be downvote",
    updatedVote.vote_type,
    "downvote",
  );

  // 8. Validate ownership restriction by trying to update with another user
  // Authenticate as a different registered user
  const otherUser: IRedditCommunityRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        email: `user2.${RandomGenerator.alphaNumeric(6)}@example.com`,
        password: "Password123",
      } satisfies IRedditCommunityRegisteredUser.ICreate,
    });
  typia.assert(otherUser);

  // Attempt to update the comment vote as other user, expect error
  await TestValidator.error(
    "non-owner cannot update comment vote",
    async () => {
      await api.functional.redditCommunity.registeredUser.redditCommunity.posts.comments.commentVotes.update(
        connection,
        {
          postId: post.id,
          commentId: comment.id,
          commentVoteId: commentVote.id,
          body: {
            vote_type: "upvote",
          } satisfies IRedditCommunityCommentVote.IUpdate,
        },
      );
    },
  );
}
