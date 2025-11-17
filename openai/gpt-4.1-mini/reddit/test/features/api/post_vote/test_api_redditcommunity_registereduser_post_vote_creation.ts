import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import type { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";

export async function test_api_redditcommunity_registereduser_post_vote_creation(
  connection: api.IConnection,
) {
  // 1. Registered user joins (authentication)
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 6,
    wordMax: 10,
  });
  const registeredUser: IRedditCommunityRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        email: userEmail,
        password: userPassword,
      } satisfies IRedditCommunityRegisteredUser.ICreate,
    });
  typia.assert(registeredUser);

  // 2. Create a community
  const communityName = RandomGenerator.alphabets(10).toLowerCase();
  const displayName = RandomGenerator.name(2);
  const description = RandomGenerator.content({ paragraphs: 2 });
  const isPrivate = false;
  const communityBody = {
    communityName: communityName,
    displayName: displayName,
    description: description,
    imageUrl: null,
    isPrivate: isPrivate,
  } satisfies IRedditCommunityCommunity.ICreate;
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.registeredUser.redditCommunity.communities.create(
      connection,
      {
        body: communityBody,
      },
    );
  typia.assert(community);

  // 3. Create a post within the community
  const postType: "text" | "link" | "image" = "text";
  const postTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 8,
  });
  const postBody = RandomGenerator.content({ paragraphs: 3 });
  const fakeCommunityId = typia.random<string & tags.Format<"uuid">>();
  const postCreateBody = {
    reddit_community_community_id: fakeCommunityId,
    type: postType,
    title: postTitle,
    body: postBody,
  } satisfies IRedditCommunityPost.ICreate;
  const post: IRedditCommunityPost =
    await api.functional.redditCommunity.registeredUser.redditCommunity.posts.create(
      connection,
      {
        body: postCreateBody,
      },
    );
  typia.assert(post);

  // 4. Create a vote on the post
  const voteTypes = ["upvote", "downvote"] as const;
  const voteType = RandomGenerator.pick(voteTypes);
  const voteCreateBody = {
    vote_type: voteType,
  } satisfies IRedditCommunityPostVote.ICreate;
  const postVote: IRedditCommunityPostVote =
    await api.functional.redditCommunity.registeredUser.redditCommunity.posts.postVotes.create(
      connection,
      {
        postId: post.id,
        body: voteCreateBody,
      },
    );
  typia.assert(postVote);

  // Validate keys linkage
  TestValidator.equals(
    "postVote.postId equals post.id",
    postVote.reddit_community_post_id,
    post.id,
  );
  TestValidator.equals(
    "postVote.userId equals registeredUser.id",
    postVote.reddit_community_registereduser_id,
    registeredUser.id,
  );
  TestValidator.equals(
    "postVote.voteType is correct",
    postVote.vote_type,
    voteType,
  );
}
