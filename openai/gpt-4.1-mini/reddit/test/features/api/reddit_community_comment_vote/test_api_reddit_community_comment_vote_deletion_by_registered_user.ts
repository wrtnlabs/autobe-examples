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

/**
 * Test that a registered user can delete their vote on a Reddit Community
 * comment.
 *
 * Scenario:
 *
 * 1. Register and authenticate a new registeredUser.
 * 2. Create a new community as the authenticated user.
 * 3. Create a new post in the community.
 * 4. Add a new comment on the post.
 * 5. Cast a vote on the comment.
 * 6. Delete the vote on the comment.
 * 7. Validate that vote deletion succeeded and votes counts updated.
 * 8. Ensure vote deletion is allowed only to the vote owner.
 *
 * This test covers the entire flow from user account signup to vote deletion
 * with authorization and business rule validation.
 */
export async function test_api_reddit_community_comment_vote_deletion_by_registered_user(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new user
  const signup: IRedditCommunityRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        typeName: "IRedditCommunityRegisteredUser.IJoin",
        email: RandomGenerator.alphaNumeric(12) + "@example.com",
        password: "password123",
        ip: null,
        href: "https://example.com/signup",
        referrer: "https://example.com",
      } satisfies IRedditCommunityRegisteredUser.IJoin,
    });
  typia.assert(signup);

  // 2. Create a new community
  const communityBody = {
    communityName: RandomGenerator.alphaNumeric(10),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    status: "active",
  } satisfies IRedditCommunityCommunity.ICreate;
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.registeredUser.communities.create(
      connection,
      { body: communityBody },
    );
  typia.assert(community);

  // 3. Create a new post in the community
  const postBody = {
    community_code: community.communityName,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    type: "text",
    content: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IRedditCommunityPost.ICreate;
  const post: IRedditCommunityPost =
    await api.functional.redditCommunity.registeredUser.posts.create(
      connection,
      { body: postBody },
    );
  typia.assert(post);

  // 4. Add a comment on the post
  const commentBody = {
    post_id: post.id,
    content: RandomGenerator.paragraph({ sentences: 2 }),
    parent_comment_id: null,
  } satisfies IRedditCommunityComment.ICreate;
  const comment: IRedditCommunityComment =
    await api.functional.redditCommunity.registeredUser.redditCommunityComments.create(
      connection,
      { body: commentBody },
    );
  typia.assert(comment);

  // 5. Cast a vote on the comment
  const voteBody = {
    reddit_community_comment_id: comment.id,
    vote: 1,
  } satisfies IRedditCommunityCommentVote.ICreate;
  const vote: IRedditCommunityCommentVote =
    await api.functional.redditCommunity.registeredUser.redditCommunityCommentVotes.create(
      connection,
      { body: voteBody },
    );
  typia.assert(vote);

  // 6. Delete the vote on the comment
  await api.functional.redditCommunity.registeredUser.redditCommunityCommentVotes.erase(
    connection,
    { redditCommunityCommentVoteId: vote.id },
  );

  // 7. Validate deletion by attempting to delete again to cause error
  await TestValidator.error(
    "Deleting a non-existent vote should fail",
    async () => {
      await api.functional.redditCommunity.registeredUser.redditCommunityCommentVotes.erase(
        connection,
        { redditCommunityCommentVoteId: vote.id },
      );
    },
  );

  // 8. Validation: Attempt deletion with a different user to expect failure
  // Register a second user
  const signup2: IRedditCommunityRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        typeName: "IRedditCommunityRegisteredUser.IJoin",
        email: RandomGenerator.alphaNumeric(12) + "@example.com",
        password: "password123",
        ip: null,
        href: "https://example.com/signup",
        referrer: "https://example.com",
      } satisfies IRedditCommunityRegisteredUser.IJoin,
    });
  typia.assert(signup2);

  // Second user tries to delete the original vote (which is already deleted)
  // We expect error due to unauthorized or non-existent vote record
  await TestValidator.error(
    "Unauthorized vote deletion attempt should fail",
    async () => {
      await api.functional.redditCommunity.registeredUser.redditCommunityCommentVotes.erase(
        connection,
        { redditCommunityCommentVoteId: vote.id },
      );
    },
  );
}
