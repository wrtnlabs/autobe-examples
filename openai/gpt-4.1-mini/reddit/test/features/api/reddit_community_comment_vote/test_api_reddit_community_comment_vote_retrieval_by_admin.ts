import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityAdminSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdminSettings";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";

export async function test_api_reddit_community_comment_vote_retrieval_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Registered User joins
  const regUserJoinBody = {
    typeName: "IRedditCommunityRegisteredUser.IJoin",
    email: `user${RandomGenerator.alphaNumeric(6)}@example.com`,
    password: "password123",
    href: "https://example.com/signup",
    referrer: "https://example.com",
  } satisfies IRedditCommunityRegisteredUser.IJoin;
  const registeredUser: IRedditCommunityRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: regUserJoinBody,
    });
  typia.assert(registeredUser);

  // Step 2: Registered User login to authenticate
  const regUserLoginBody = {
    email: registeredUser.email,
    password: "password123",
    href: "https://example.com/login",
    referrer: "https://example.com",
  } satisfies IRedditCommunityRegisteredUser.ILogin;
  await api.functional.auth.registeredUser.login(connection, {
    body: regUserLoginBody,
  });

  // Step 3: Create community
  const communityBody = {
    communityName: `community_${RandomGenerator.alphaNumeric(6)}`,
    description: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 4,
      wordMax: 8,
    }),
    status: "active",
  } satisfies IRedditCommunityCommunity.ICreate;
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.registeredUser.communities.create(
      connection,
      { body: communityBody },
    );
  typia.assert(community);

  // Step 4: Create post in the community
  const postBody = {
    community_code: community.communityName,
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    type: "text",
    content: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IRedditCommunityPost.ICreate;
  const post: IRedditCommunityPost =
    await api.functional.redditCommunity.registeredUser.posts.create(
      connection,
      { body: postBody },
    );
  typia.assert(post);

  // Step 5: Create comment on the post
  const commentBody = {
    post_id: post.id,
    content: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 9,
    }),
    parent_comment_id: null,
  } satisfies IRedditCommunityComment.ICreate;
  const comment: IRedditCommunityComment =
    await api.functional.redditCommunity.registeredUser.redditCommunityComments.create(
      connection,
      { body: commentBody },
    );
  typia.assert(comment);

  // Step 6: Cast vote on the comment
  const voteBody = {
    reddit_community_comment_id: comment.id,
    vote: 1,
  } satisfies IRedditCommunityCommentVote.ICreate;
  const commentVote: IRedditCommunityCommentVote =
    await api.functional.redditCommunity.registeredUser.redditCommunityCommentVotes.create(
      connection,
      { body: voteBody },
    );
  typia.assert(commentVote);

  // Step 7: Create admin user
  const adminJoinBody = {
    email: `admin${RandomGenerator.alphaNumeric(6)}@example.com`,
    password: "password123",
  } satisfies IRedditCommunityAdmin.ICreate;
  const adminUser: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(adminUser);

  // Step 8: Admin login to authenticate
  const adminLoginBody = {
    email: adminUser.email,
    password: "password123",
    href: "https://example.com/admin/login",
    referrer: "https://example.com",
  } satisfies IRedditCommunityAdmin.ILogin;
  await api.functional.auth.admin.login(connection, { body: adminLoginBody });

  // Step 9: Admin retrieves the comment vote
  const retrievedVote: IRedditCommunityCommentVote =
    await api.functional.redditCommunity.admin.redditCommunityCommentVotes.at(
      connection,
      { redditCommunityCommentVoteId: commentVote.id },
    );
  typia.assert(retrievedVote);

  // Validate the retrieved vote matches the created vote
  TestValidator.equals(
    "retrieved comment vote equals created vote",
    retrievedVote.id,
    commentVote.id,
  );
  TestValidator.equals(
    "retrieved comment vote comment id",
    retrievedVote.reddit_community_comment_id,
    commentVote.reddit_community_comment_id,
  );
  TestValidator.equals(
    "retrieved comment vote user id",
    retrievedVote.reddit_community_registered_user_id,
    commentVote.reddit_community_registered_user_id,
  );
  TestValidator.equals(
    "retrieved comment vote value",
    retrievedVote.vote,
    commentVote.vote,
  );
}
