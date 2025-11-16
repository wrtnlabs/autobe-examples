import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import type { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";

export async function test_api_reddit_community_post_vote_deletion_by_registered_user(
  connection: api.IConnection,
) {
  // 1. Register a new user to obtain authentication tokens
  const userEmail = `${RandomGenerator.alphaNumeric(8)}@example.com`;
  const joinBody: IRedditCommunityRegisteredUser.IJoin = {
    typeName: "IRedditCommunityRegisteredUser.IJoin",
    email: userEmail,
    password: "StrongPass!123",
    ip: null,
    href: "https://reddit.example.com/signup",
    referrer: "https://reddit.example.com/",
  };
  const user: IRedditCommunityRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: joinBody,
    });
  typia.assert(user);

  // 2. Create a new reddit community
  const communityCreateBody = {
    communityName: `testcommunity${RandomGenerator.alphaNumeric(5)}`,
    description: "Test reddit community for E2E voting deletion",
    status: "active",
  } satisfies IRedditCommunityCommunity.ICreate;
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.registeredUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);
  TestValidator.equals(
    "community name should match",
    community.communityName,
    communityCreateBody.communityName,
  );

  // 3. Create a new post inside the community
  const postCreateBody = {
    community_code: community.communityName,
    title: RandomGenerator.paragraph({ sentences: 5, wordMin: 3, wordMax: 8 }),
    type: "text" as const,
    content: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 4,
      wordMax: 8,
    }),
  } satisfies IRedditCommunityPost.ICreate;
  const post: IRedditCommunityPost =
    await api.functional.redditCommunity.registeredUser.posts.create(
      connection,
      { body: postCreateBody },
    );
  typia.assert(post);
  TestValidator.equals(
    "post community code matches",
    post.community_code,
    community.communityName,
  );
  TestValidator.equals("post title matches", post.title, postCreateBody.title);
  TestValidator.predicate(
    "post votes count starts at zero",
    post.votes_count === 0,
  );

  // 4. Cast a vote (upvote) on the post
  const voteCreateBody = {
    reddit_community_post_id: post.id,
    vote_value: 1 as const,
  } satisfies IRedditCommunityPostVote.ICreate;
  const vote: IRedditCommunityPostVote =
    await api.functional.redditCommunity.registeredUser.redditCommunityPostVotes.create(
      connection,
      { body: voteCreateBody },
    );
  typia.assert(vote);
  TestValidator.equals(
    "vote post id matches",
    vote.redditCommunityPostId,
    post.id,
  );
  TestValidator.equals("vote value is upvote", vote.vote, 1);

  // 5. Due to limitations in provided API, cannot refetch post to verify vote count
  // so this validation is omitted

  // 6. Delete the vote
  await api.functional.redditCommunity.registeredUser.redditCommunityPostVotes.erase(
    connection,
    {
      redditCommunityPostVoteId: vote.id,
    },
  );

  // 7. Attempt to delete again should throw error
  await TestValidator.error(
    "deleting already deleted vote should throw",
    async () => {
      await api.functional.redditCommunity.registeredUser.redditCommunityPostVotes.erase(
        connection,
        { redditCommunityPostVoteId: vote.id },
      );
    },
  );
}
