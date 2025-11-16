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

export async function test_api_reddit_community_comment_vote_creation_by_registered_user(
  connection: api.IConnection,
) {
  // 1. Registered user joins (registers and authenticates)
  const joinRequest = {
    typeName: "IRedditCommunityRegisteredUser.IJoin",
    email: RandomGenerator.alphaNumeric(6) + "@example.com",
    password: "_P@ssW0rd1234_",
    href: "https://test.example.com/signup",
    referrer: "https://test.example.com/landing",
  } satisfies IRedditCommunityRegisteredUser.IJoin;

  const authorizedUser: IRedditCommunityRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: joinRequest,
    });
  typia.assert(authorizedUser);

  // 2. Create a Reddit Community
  const communityCreateBody = {
    communityName: RandomGenerator.alphaNumeric(10),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    status: "active",
  } satisfies IRedditCommunityCommunity.ICreate;

  const createdCommunity: IRedditCommunityCommunity =
    await api.functional.redditCommunity.registeredUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(createdCommunity);

  // 3. Create a post in the community
  const postCreateBody = {
    community_code: createdCommunity.communityName,
    title: RandomGenerator.paragraph({ sentences: 1, wordMin: 4, wordMax: 10 }),
    type: "text" as const,
    content: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies IRedditCommunityPost.ICreate;

  const createdPost: IRedditCommunityPost =
    await api.functional.redditCommunity.registeredUser.posts.create(
      connection,
      { body: postCreateBody },
    );
  typia.assert(createdPost);

  // 4. Create a comment on the post
  const commentCreateBody = {
    post_id: createdPost.id,
    content: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 5,
      wordMax: 12,
    }),
  } satisfies IRedditCommunityComment.ICreate;

  const createdComment: IRedditCommunityComment =
    await api.functional.redditCommunity.registeredUser.redditCommunityComments.create(
      connection,
      { body: commentCreateBody },
    );
  typia.assert(createdComment);

  // 5. Cast a vote on the comment
  const voteCreateBody = {
    reddit_community_comment_id: createdComment.id,
    vote: 1,
  } satisfies IRedditCommunityCommentVote.ICreate;

  const createdVote: IRedditCommunityCommentVote =
    await api.functional.redditCommunity.registeredUser.redditCommunityCommentVotes.create(
      connection,
      { body: voteCreateBody },
    );
  typia.assert(createdVote);

  // Validations
  TestValidator.equals(
    "communityName matches",
    createdCommunity.communityName,
    communityCreateBody.communityName,
  );
  TestValidator.equals(
    "post belongs to community",
    createdPost.community_code,
    createdCommunity.communityName,
  );
  TestValidator.equals(
    "comment belongs to post",
    createdComment.post_id,
    createdPost.id,
  );
  TestValidator.equals(
    "vote belongs to comment",
    createdVote.reddit_community_comment_id,
    createdComment.id,
  );
  TestValidator.equals("vote value is 1 (upvote)", createdVote.vote, 1);
  TestValidator.equals(
    "vote user id matches authorized user",
    createdVote.reddit_community_registered_user_id,
    authorizedUser.id,
  );
}
