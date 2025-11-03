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

export async function test_api_post_vote_create_by_authenticated_user(
  connection: api.IConnection,
) {
  // User registration and authentication
  const userCreateBody = {
    email: `user_${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "1234",
    href: `https://example.com/${RandomGenerator.alphaNumeric(10)}`,
    referrer: `https://referrer.com/${RandomGenerator.alphaNumeric(10)}`,
  } satisfies IRedditCommunityUser.ICreate;

  const userAuth: IRedditCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: userCreateBody,
    });
  typia.assert(userAuth);

  // Create a new community
  const communityCreateBody = {
    name: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 5,
      wordMax: 10,
    }),
  } satisfies IRedditCommunityCommunity.ICreate;

  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.user.communities.create(connection, {
      body: communityCreateBody,
    });
  typia.assert(community);
  TestValidator.equals(
    "created community matches request",
    community.name,
    communityCreateBody.name,
  );

  // Create a post within the community
  const contentTypeId = typia.random<string & tags.Format<"uuid">>();

  const postCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 15 }),
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 3,
      sentenceMax: 5,
      wordMin: 5,
      wordMax: 10,
    }),
    reddit_community_content_type_id: contentTypeId,
    status: "active",
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
  TestValidator.equals("post title matches", post.title, postCreateBody.title);

  // Create a vote on the post
  const voteCreateBody = {
    reddit_community_post_id: post.id,
    reddit_community_user_id: userAuth.id,
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
  TestValidator.equals("vote type is upvote", vote.vote_type, "upvote");
  TestValidator.equals(
    "vote user ID matches authenticated user",
    vote.reddit_community_user_id,
    userAuth.id,
  );
  TestValidator.equals(
    "vote post ID matches",
    vote.reddit_community_post_id,
    post.id,
  );
  TestValidator.equals(
    "vote community ID matches",
    vote.reddit_community_community_id,
    community.id,
  );

  // Test prevention of duplicate vote
  await TestValidator.error("duplicate vote should fail", async () => {
    await api.functional.redditCommunity.user.communities.posts.votes.createVoteOnPost(
      connection,
      {
        communityName: community.name,
        postId: post.id,
        body: voteCreateBody,
      },
    );
  });
}
