import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityContentReport";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import type { IRedditCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUser";
import type { IRedditCommunityUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserSession";

export async function test_api_post_vote_update_vote_type_by_vote_id(
  connection: api.IConnection,
) {
  // 1. Register a new user and login
  const user: IRedditCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: `user_${RandomGenerator.alphaNumeric(8)}@example.com`,
        password: "Test1234!",
        href: "http://localhost/",
        referrer: "http://localhost/referrer",
      } satisfies IRedditCommunityUser.ICreate,
    });
  typia.assert(user);

  // 2. Create a new community
  const communityBody = {
    name: `community_${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IRedditCommunityCommunity.ICreate;

  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.user.communities.create(connection, {
      body: communityBody,
    });
  typia.assert(community);

  // 3. Create a new post in the community
  // We need a valid content type UUID. Since no content types are given,
  // use a dummy uuid string with valid format assuming 'reddit_community_content_type_id' exists
  // But the schema has no exact contents for content type, so we generate a random UUID
  // to satisfy format constraints.

  // Generate post creation data
  const postCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 5 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    reddit_community_content_type_id: typia.random<
      string & tags.Format<"uuid">
    >(),
    status: "active",
    image_uri: null,
  } satisfies IRedditCommunityPost.ICreate;

  const post: IRedditCommunityPost =
    await api.functional.redditCommunity.user.communities.posts.create(
      connection,
      {
        communityName: community.name,
        body: postCreateBody,
      },
    );
  typia.assert(post);

  // 4. Create an initial vote for the post
  const voteCreateBody = {
    reddit_community_post_id: post.id,
    reddit_community_user_id: user.id,
    reddit_community_community_id: community.id,
    vote_type: "upvote",
  } satisfies IRedditCommunityPostVote.ICreate;

  const vote: IRedditCommunityPostVote =
    await api.functional.redditCommunity.user.communities.posts.votes.createVoteOnPost(
      connection,
      {
        communityName: community.name,
        postId: post.id,
        body: voteCreateBody,
      },
    );
  typia.assert(vote);

  // 5. Update the vote to a new type
  const updatedVoteType: IRedditCommunityPostVote.IUpdate = {
    vote_type: vote.vote_type === "upvote" ? "downvote" : "upvote",
  };

  const updatedVote: IRedditCommunityPostVote =
    await api.functional.redditCommunity.user.communities.posts.votes.updateVoteOnPost(
      connection,
      {
        communityName: community.name,
        postId: post.id,
        voteId: vote.id,
        body: updatedVoteType,
      },
    );
  typia.assert(updatedVote);

  // 6. Validate that vote type was updated correctly
  TestValidator.equals(
    "vote type updated",
    updatedVote.vote_type,
    updatedVoteType.vote_type,
  );

  // 7. Try updating vote with unauthorized user
  // Attempt update without authentication or new user
  // create another user
  const user2: IRedditCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: `user_${RandomGenerator.alphaNumeric(8)}@example.com`,
        password: "Test1234!",
        href: "http://localhost/",
        referrer: "http://localhost/referrer",
      } satisfies IRedditCommunityUser.ICreate,
    });
  typia.assert(user2);

  // We are expected to fail update by new user for existing vote
  await TestValidator.error(
    "unauthorized user vote update should fail",
    async () => {
      await api.functional.redditCommunity.user.communities.posts.votes.updateVoteOnPost(
        connection,
        {
          communityName: community.name,
          postId: post.id,
          voteId: vote.id,
          body: {
            vote_type: "upvote",
          } satisfies IRedditCommunityPostVote.IUpdate,
        },
      );
    },
  );
}
