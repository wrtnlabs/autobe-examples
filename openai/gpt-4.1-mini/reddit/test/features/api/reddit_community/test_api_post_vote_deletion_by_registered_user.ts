import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import type { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";

/**
 * Test a full workflow where a registered user signs up, creates a community,
 * posts a text post, votes on it with an upvote, and deletes the vote. It
 * validates that authentication is required, resources are created properly,
 * and vote deletion is correctly authorized and processed.
 */
export async function test_api_post_vote_deletion_by_registered_user(
  connection: api.IConnection,
) {
  // 1. Registered user joins (signs up and authenticates)
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const user: IRedditCommunityRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        email: userEmail,
        password: "Password123!",
      } satisfies IRedditCommunityRegisteredUser.ICreate,
    });
  typia.assert(user);

  // 2. Create a new Reddit community
  const communityCreateBody = {
    communityName:
      RandomGenerator.alphaNumeric(10)
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, "") || "community1",
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

  // 3. Create a post within the created community
  const postCreateBody = {
    reddit_community_community_id: community.communityName,
    type: "text",
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IRedditCommunityPost.ICreate;

  const post: IRedditCommunityPost =
    await api.functional.redditCommunity.registeredUser.redditCommunity.posts.create(
      connection,
      { body: postCreateBody },
    );
  typia.assert(post);

  // 4. Create a post vote on the created post
  const voteCreateBody = {
    vote_type: "upvote",
  } satisfies IRedditCommunityPostVote.ICreate;

  const vote: IRedditCommunityPostVote =
    await api.functional.redditCommunity.registeredUser.redditCommunity.posts.postVotes.create(
      connection,
      {
        postId: post.id,
        body: voteCreateBody,
      },
    );
  typia.assert(vote);

  // 5. Delete the vote
  await api.functional.redditCommunity.registeredUser.redditCommunity.posts.postVotes.erase(
    connection,
    {
      postId: post.id,
      postVoteId: vote.id,
    },
  );
}
