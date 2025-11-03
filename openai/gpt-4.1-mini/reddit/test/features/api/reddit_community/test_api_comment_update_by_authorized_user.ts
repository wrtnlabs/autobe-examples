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
 * Test updating a comment in a community post by an authenticated user.
 *
 * This test covers the full lifecycle from user registration, login, community
 * creation, content type creation by admin, post creation in community, comment
 * creation, and updating the comment's content.
 *
 * Steps:
 *
 * 1. Register user.
 * 2. Login user to obtain auth token.
 * 3. Register admin user.
 * 4. Login admin to obtain auth token.
 * 5. Admin creates content type for post and comment.
 * 6. User creates a community.
 * 7. User creates a post in the community using the content type.
 * 8. User creates a comment on the post.
 * 9. User updates the comment content.
 * 10. Verify that the comment content and updated_at timestamp have changed
 *     correctly.
 */
export async function test_api_comment_update_by_authorized_user(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const userJoinBody = {
    email: RandomGenerator.alphaNumeric(10) + "@example.com",
    password: "StrongPassword1!",
    href: "https://example.com/page",
    referrer: "https://referrer.example.com",
  } satisfies IRedditCommunityUser.ICreate;

  const userAuthorized: IRedditCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: userJoinBody,
    });
  typia.assert(userAuthorized);

  // 2. Login user to get latest auth token
  const userLoginBody = {
    email: userJoinBody.email,
    password: userJoinBody.password,
    href: userJoinBody.href,
    referrer: userJoinBody.referrer,
  } satisfies IRedditCommunityUser.ILogin;

  const userLoginAuthorized: IRedditCommunityUser.IAuthorized =
    await api.functional.auth.user.login(connection, {
      body: userLoginBody,
    });
  typia.assert(userLoginAuthorized);

  // 3. Register admin user
  const adminJoinBody = {
    user_id: typia.assert<string>(userAuthorized.id), // use user.id for creating admin for completeness
  } satisfies IRedditCommunityAdmin.ICreate;

  const adminAuthorized: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 4. Login admin
  const adminLoginBody = {
    email: userJoinBody.email,
    password: userJoinBody.password,
    href: userJoinBody.href,
    referrer: userJoinBody.referrer,
  } satisfies IRedditCommunityAdmin.ILogin;

  const adminLoginAuthorized: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAuthorized);

  // 5. Admin creates content type
  const contentTypeBody = {
    content_type_code: "text",
    content_type_name: "Text",
    description: "text content type for posts and comments",
  } satisfies IRedditCommunityContentType.ICreate;

  const createdContentType: IRedditCommunityContentType =
    await api.functional.redditCommunity.admin.redditCommunityContentTypes.create(
      connection,
      {
        body: contentTypeBody,
      },
    );
  typia.assert(createdContentType);

  // 6. User creates a community
  const communityBody = {
    name: "community_" + RandomGenerator.alphaNumeric(5),
    description: "A test community",
  } satisfies IRedditCommunityCommunity.ICreate;

  const createdCommunity: IRedditCommunityCommunity =
    await api.functional.redditCommunity.user.communities.create(connection, {
      body: communityBody,
    });
  typia.assert(createdCommunity);

  // 7. User creates a post in the community using content type
  const postBody = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 7 }),
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    reddit_community_content_type_id: createdContentType.id,
    status: "active",
  } satisfies IRedditCommunityPost.ICreate;

  const createdPost: IRedditCommunityPost =
    await api.functional.redditCommunity.user.communities.posts.create(
      connection,
      {
        communityName: createdCommunity.name,
        body: postBody,
      },
    );
  typia.assert(createdPost);

  // 8. User creates a comment on the post
  const commentBody = {
    body: RandomGenerator.paragraph({ sentences: 5, wordMin: 4, wordMax: 8 }),
  } satisfies IRedditCommunityComment.ICreate;

  const createdComment: IRedditCommunityComment =
    await api.functional.redditCommunity.user.communities.posts.comments.create(
      connection,
      {
        communityName: createdCommunity.name,
        postId: createdPost.id,
        body: commentBody,
      },
    );
  typia.assert(createdComment);

  // 9. User updates the comment content
  const updatedCommentBody = {
    body: RandomGenerator.paragraph({ sentences: 7, wordMin: 4, wordMax: 10 }),
  } satisfies IRedditCommunityComment.IUpdate;

  const updatedComment: IRedditCommunityComment =
    await api.functional.redditCommunity.user.communities.posts.comments.update(
      connection,
      {
        communityName: createdCommunity.name,
        postId: createdPost.id,
        commentId: createdComment.id,
        body: updatedCommentBody,
      },
    );
  typia.assert(updatedComment);

  // 10. Validate comment content updated and updated_at changed
  TestValidator.equals(
    "comment id should be same",
    updatedComment.id,
    createdComment.id,
  );

  TestValidator.notEquals(
    "comment body should be updated",
    updatedComment.body,
    createdComment.body,
  );

  TestValidator.predicate(
    "comment updated_at should be later than original",
    new Date(updatedComment.updated_at).getTime() >
      new Date(createdComment.updated_at).getTime(),
  );
}
