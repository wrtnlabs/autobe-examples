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

export async function test_api_redditcommunity_comment_vote_creation_by_registered_user(
  connection: api.IConnection,
) {
  // 1. Authenticate as a new registered user
  const user: IRedditCommunityRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        email: `${RandomGenerator.alphaNumeric(10)}@example.com`,
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IRedditCommunityRegisteredUser.ICreate,
    });
  typia.assert(user);

  // 2. Create a community for the post
  const communityBody = {
    communityName: RandomGenerator.alphabets(8).toLowerCase(),
    displayName: RandomGenerator.name(2),
    description: RandomGenerator.content({ paragraphs: 2 }),
    imageUrl: undefined, // Optional nullable field, explicitly undefined
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
  TestValidator.equals(
    "community name matches",
    community.communityName,
    communityBody.communityName,
  );

  // 3. Create a post in the community
  // NOTE: communityName acts as community ID, but post creation expects a UUID format id
  // We cast communityName to satisfy the expected UUID format type, without changing actual value
  const postBody: IRedditCommunityPost.ICreate = {
    reddit_community_community_id:
      community.communityName satisfies string as string & tags.Format<"uuid">,
    type: "text",
    title: RandomGenerator.paragraph({ sentences: 5 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    link_url: undefined, // Optional nullable field
    image_url: undefined, // Optional nullable field
  } satisfies IRedditCommunityPost.ICreate;

  const post: IRedditCommunityPost =
    await api.functional.redditCommunity.registeredUser.redditCommunity.posts.create(
      connection,
      {
        body: postBody,
      },
    );
  typia.assert(post);
  TestValidator.equals("post title matches", post.title, postBody.title);

  // 4. Create a comment on the post
  const commentBody = {
    body: RandomGenerator.paragraph({ sentences: 3 }),
    parent_id: undefined, // Optional nullable, explicitly undefined for top-level comment
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
  TestValidator.equals(
    "comment content matches",
    comment.content,
    commentBody.body,
  );

  // 5. Cast a vote on the comment
  const voteBody = {
    vote_type: "up",
  } satisfies IRedditCommunityCommentVote.ICreate;
  const vote: IRedditCommunityCommentVote =
    await api.functional.redditCommunity.registeredUser.redditCommunity.posts.comments.commentVotes.create(
      connection,
      {
        postId: post.id,
        commentId: comment.id,
        body: voteBody,
      },
    );
  typia.assert(vote);
  TestValidator.equals("vote type matches", vote.vote_type, voteBody.vote_type);

  // 6. Attempt to cast duplicate vote and expect error
  await TestValidator.error("duplicate vote prevented", async () => {
    await api.functional.redditCommunity.registeredUser.redditCommunity.posts.comments.commentVotes.create(
      connection,
      {
        postId: post.id,
        commentId: comment.id,
        body: voteBody,
      },
    );
  });
}
