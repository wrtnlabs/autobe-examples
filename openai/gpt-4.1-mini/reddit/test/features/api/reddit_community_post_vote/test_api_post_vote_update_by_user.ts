import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPostVote";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityContentReport";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import type { IRedditCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUser";
import type { IRedditCommunityUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserSession";

export async function test_api_post_vote_update_by_user(
  connection: api.IConnection,
) {
  // 1. Register a new user and authenticate
  const userBody = {
    email: RandomGenerator.alphaNumeric(10) + "@example.com",
    password: "password123",
    ip: null,
    href: "https://test.com/page",
    referrer: "https://referrer.com/home",
  } satisfies IRedditCommunityUser.ICreate;

  const user: IRedditCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: userBody });
  typia.assert(user);

  // 2. Create a new community
  const communityBody = {
    name: "testcommunity" + RandomGenerator.alphaNumeric(4),
    description: "Test community description",
  } satisfies IRedditCommunityCommunity.ICreate;

  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.user.communities.create(connection, {
      body: communityBody,
    });
  typia.assert(community);

  // 3. Create a new post in the community
  const contentTypeId = typia.random<string & tags.Format<"uuid">>();

  const postBody = {
    title: "Test Post Title",
    body: "Test post content.",
    image_uri: null,
    reddit_community_content_type_id: contentTypeId,
    status: "active",
  } satisfies IRedditCommunityPost.ICreate;

  const post: IRedditCommunityPost =
    await api.functional.redditCommunity.user.communities.posts.create(
      connection,
      { communityName: community.name, body: postBody },
    );
  typia.assert(post);

  // 4. Create an initial vote on the post by the user
  const voteBodyCreate = {
    reddit_community_post_id: post.id,
    reddit_community_user_id: user.id,
    reddit_community_community_id: community.id,
    vote_type: "upvote",
  } satisfies IRedditCommunityPostVote.ICreate;

  const voteCreated: IRedditCommunityPostVote =
    await api.functional.redditCommunity.user.communities.posts.votes.createVoteOnPost(
      connection,
      { communityName: community.name, postId: post.id, body: voteBodyCreate },
    );
  typia.assert(voteCreated);

  // 5. Update the vote from upvote to downvote
  const voteUpdateBody = {
    vote_type: "downvote",
  } satisfies IRedditCommunityPostVote.IRequest;

  const voteUpdated: IPageIRedditCommunityPostVote.ISummary =
    await api.functional.redditCommunity.user.communities.posts.votes.index(
      connection,
      { communityName: community.name, postId: post.id, body: voteUpdateBody },
    );
  typia.assert(voteUpdated);

  // 6. Validate that vote counts reflect the updated vote, specifically for this user
  TestValidator.predicate(
    "vote update reflects on user's vote",
    voteUpdated.data.some(
      (v) =>
        v.reddit_community_user_id === user.id && v.vote_type === "downvote",
    ),
  );
  TestValidator.predicate(
    "user's vote no longer is upvote",
    !voteUpdated.data.some(
      (v) => v.reddit_community_user_id === user.id && v.vote_type === "upvote",
    ),
  );

  // 7. Try updating the vote without authentication - expect failure
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated cannot update vote", async () => {
    await api.functional.redditCommunity.user.communities.posts.votes.index(
      unauthConnection,
      { communityName: community.name, postId: post.id, body: voteUpdateBody },
    );
  });

  // 8. Register another user
  const otherUserBody = {
    email: RandomGenerator.alphaNumeric(10) + "@example.com",
    password: "password123",
    ip: null,
    href: "https://test.com/page",
    referrer: "https://referrer.com/home",
  } satisfies IRedditCommunityUser.ICreate;

  const otherUser: IRedditCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: otherUserBody });
  typia.assert(otherUser);

  // 9. Other user tries to update the first user's vote - expect failure
  const voteUpdateBodyByOtherUser = {
    vote_type: "upvote",
  } satisfies IRedditCommunityPostVote.IRequest;

  await TestValidator.error(
    "other user cannot update someone else's vote",
    async () => {
      await api.functional.redditCommunity.user.communities.posts.votes.index(
        connection,
        {
          communityName: community.name,
          postId: post.id,
          body: voteUpdateBodyByOtherUser,
        },
      );
    },
  );
}
