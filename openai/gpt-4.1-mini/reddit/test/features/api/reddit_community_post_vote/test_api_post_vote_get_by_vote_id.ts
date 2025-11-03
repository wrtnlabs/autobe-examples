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

export async function test_api_post_vote_get_by_vote_id(
  connection: api.IConnection,
) {
  // 1. User registration
  const user: IRedditCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: `${RandomGenerator.alphaNumeric(6)}@example.com`,
        password: "P@ssw0rd123",
        ip: null,
        href: "https://reddit.com",
        referrer: "https://google.com",
      } satisfies IRedditCommunityUser.ICreate,
    });
  typia.assert(user);

  // 2. Create a community
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.user.communities.create(connection, {
      body: {
        name: RandomGenerator.alphaNumeric(10),
        description: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 4,
          wordMax: 8,
        }),
      } satisfies IRedditCommunityCommunity.ICreate,
    });
  typia.assert(community);

  // 3. Create a post inside the community
  const contentTypeId = typia.random<string & tags.Format<"uuid">>();
  const postBody = {
    title: RandomGenerator.paragraph({ sentences: 4, wordMin: 4, wordMax: 8 }),
    body: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 10,
      sentenceMax: 20,
      wordMin: 3,
      wordMax: 7,
    }),
    image_uri: null,
    reddit_community_content_type_id: contentTypeId,
    status: "active",
  } satisfies IRedditCommunityPost.ICreate;

  const post: IRedditCommunityPost =
    await api.functional.redditCommunity.user.communities.posts.create(
      connection,
      {
        communityName: community.name,
        body: postBody,
      },
    );
  typia.assert(post);

  // 4. Cast a vote on the post
  // Creating a vote requires user ID, post ID, community ID, and a vote_type
  const voteBody = {
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
        body: voteBody,
      },
    );
  typia.assert(vote);

  TestValidator.equals(
    "vote user matches",
    vote.reddit_community_user_id,
    user.id,
  );
  TestValidator.equals(
    "vote post matches",
    vote.reddit_community_post_id,
    post.id,
  );
  TestValidator.equals(
    "vote community matches",
    vote.reddit_community_community_id,
    community.id,
  );
  TestValidator.equals("vote type is upvote", vote.vote_type, "upvote");

  // 5. Retrieve the vote by voteId
  const retrievedVote: IRedditCommunityPostVote =
    await api.functional.redditCommunity.user.communities.posts.votes.at(
      connection,
      {
        communityName: community.name,
        postId: post.id,
        voteId: vote.id,
      },
    );
  typia.assert(retrievedVote);

  TestValidator.equals("retrieved vote ID matches", retrievedVote.id, vote.id);
  TestValidator.equals(
    "retrieved vote user matches",
    retrievedVote.reddit_community_user_id,
    user.id,
  );
  TestValidator.equals(
    "retrieved vote post matches",
    retrievedVote.reddit_community_post_id,
    post.id,
  );
  TestValidator.equals(
    "retrieved vote community matches",
    retrievedVote.reddit_community_community_id,
    community.id,
  );
  TestValidator.equals(
    "retrieved vote type is upvote",
    retrievedVote.vote_type,
    "upvote",
  );
}
