import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityContentReport";
import type { IRedditCommunityContentType } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityContentType";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import type { IRedditCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUser";
import type { IRedditCommunityUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserSession";

/**
 * Validate the process of creating a vote on a post within a Reddit community
 * by an authenticated user.
 *
 * This comprehensive test covers the following steps:
 *
 * 1. User registration and login to obtain authentication.
 * 2. Admin registration and login to obtain administrative privileges.
 * 3. Creation of a content type for post validation.
 * 4. Creation of a community.
 * 5. Creation of a post in the community with the created content type.
 * 6. Authenticated user creates a vote on the post within the community.
 * 7. Validation of the vote record ensuring correct linkage and vote type.
 * 8. Testing duplicate vote prevention by attempting to create the same vote again
 *    and expecting rejection.
 *
 * All API responses are validated using typia.assert() to enforce strict type
 * conformity. TestValidator functions are used to assert business logic and
 * expected behaviors.
 *
 * This test ensures integrity across user and admin actors and realistic
 * interaction flows within the Reddit community domain.
 */
export async function test_api_post_vote_creation_by_user(
  connection: api.IConnection,
) {
  // 1. User registration and login
  const userJoinBody = {
    email: `${RandomGenerator.alphaNumeric(5)}@example.com`,
    password: "P@ssword123",
    ip: null,
    href: "https://test.com/signup",
    referrer: "https://test.com",
  } satisfies IRedditCommunityUser.ICreate;

  const user: IRedditCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: userJoinBody,
    });
  typia.assert(user);

  const userLoginBody = {
    email: user.email,
    password: "P@ssword123",
    ip: null,
    href: "https://test.com/login",
    referrer: "https://test.com",
  } satisfies IRedditCommunityUser.ILogin;

  const userAuth: IRedditCommunityUser.IAuthorized =
    await api.functional.auth.user.login(connection, {
      body: userLoginBody,
    });
  typia.assert(userAuth);

  // 2. Admin registration and login
  // We create separate user for admin and then create admin linked to that user
  const adminUserJoinBody = {
    email: `${RandomGenerator.alphaNumeric(5)}@admin.com`,
    password: "P@ssword123",
    ip: null,
    href: "https://admin.com/signup",
    referrer: "https://admin.com",
  } satisfies IRedditCommunityUser.ICreate;

  const adminUser: IRedditCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: adminUserJoinBody,
    });
  typia.assert(adminUser);

  const adminJoinBody = {
    user_id: adminUser.id,
  } satisfies IRedditCommunityAdmin.ICreate;

  const admin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  const adminLoginBody = {
    email: adminUser.email,
    password: "P@ssword123",
    ip: null,
    href: "https://admin.com/login",
    referrer: "https://admin.com",
  } satisfies IRedditCommunityAdmin.ILogin;

  const adminAuth: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAuth);

  // 3. Create content type
  const contentTypeCreateBody = {
    content_type_code: RandomGenerator.alphaNumeric(4),
    content_type_name: RandomGenerator.name(2),
    description: "Random content type for testing",
  } satisfies IRedditCommunityContentType.ICreate;

  const contentType: IRedditCommunityContentType =
    await api.functional.redditCommunity.admin.redditCommunityContentTypes.create(
      connection,
      {
        body: contentTypeCreateBody,
      },
    );
  typia.assert(contentType);

  // 4. Create community
  const communityCreateBody = {
    name: `test_community_${RandomGenerator.alphaNumeric(6)}`,
    description: "Community for post vote creation test",
  } satisfies IRedditCommunityCommunity.ICreate;

  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.user.communities.create(connection, {
      body: communityCreateBody,
    });
  typia.assert(community);

  // 5. Create post in the community
  const postCreateBody = {
    title: `Test Post ${RandomGenerator.alphaNumeric(6)}`,
    body: RandomGenerator.content({ paragraphs: 1 }),
    image_uri: null,
    reddit_community_content_type_id: contentType.id,
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

  // 6. Create a vote on the post as the authenticated user
  const voteCreateBody = {
    reddit_community_post_id: post.id,
    reddit_community_user_id: userAuth.id,
    reddit_community_community_id: community.id,
    vote_type: RandomGenerator.pick(["upvote", "downvote"] as const),
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
  TestValidator.equals(
    "vote user ID matches",
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
  TestValidator.predicate(
    "vote type is valid",
    vote.vote_type === "upvote" || vote.vote_type === "downvote",
  );

  // 7. Attempt to create a duplicate vote by the same user and expect an error
  await TestValidator.error("duplicate vote is rejected", async () => {
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
