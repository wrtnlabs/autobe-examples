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
 * Tests that a user can update an existing comment on a post within a
 * community.
 *
 * This comprehensive test covers the following main steps:
 *
 * 1. Register and login as a user.
 * 2. Register and login as a second user (to emphasize authorization boundaries).
 * 3. Admin registers and logs in to create a content type.
 * 4. First user creates a community.
 * 5. First user creates a post in the community.
 * 6. First user comments on the post.
 * 7. First user updates their comment with new content.
 * 8. Validate that the updated comment content matches expected data.
 * 9. Verify that a second user is forbidden from updating first user's comment.
 */
export async function test_api_redditcomment_update_by_user(
  connection: api.IConnection,
) {
  // 1. User A registers and logs in
  const userAEmail: string = typia.random<string & tags.Format<"email">>();
  const userACreateBody = {
    email: userAEmail,
    password: "ValidPass123!",
    href: "http://localhost/pageA",
    referrer: "http://localhost/referrerA",
  } satisfies IRedditCommunityUser.ICreate;
  const userA: IRedditCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: userACreateBody,
    });
  typia.assert(userA);

  // 2. User B registers and logs in
  const userBEmail: string = typia.random<string & tags.Format<"email">>();
  const userBCreateBody = {
    email: userBEmail,
    password: "ValidPass456!",
    href: "http://localhost/pageB",
    referrer: "http://localhost/referrerB",
  } satisfies IRedditCommunityUser.ICreate;
  const userB: IRedditCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: userBCreateBody,
    });
  typia.assert(userB);

  // 3. Admin registers and logs in to create a content type
  // Admin join/login
  const adminUserEmail: string = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    user_id: userA.id,
  } satisfies IRedditCommunityAdmin.ICreate;
  const admin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // Admin creates content type
  const contentTypeCreateBody = {
    content_type_code: "text",
    content_type_name: "Text",
    description: "Plain text posts",
  } satisfies IRedditCommunityContentType.ICreate;
  const contentType: IRedditCommunityContentType =
    await api.functional.redditCommunity.admin.redditCommunityContentTypes.create(
      connection,
      {
        body: contentTypeCreateBody,
      },
    );
  typia.assert(contentType);

  // 4. User A creates a community
  const communityName = RandomGenerator.name(1)
    .replace(/\s+/g, "_")
    .toLowerCase();
  const communityCreateBody = {
    name: communityName,
    description: "Sample community for testing",
  } satisfies IRedditCommunityCommunity.ICreate;
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.user.communities.create(connection, {
      body: communityCreateBody,
    });
  typia.assert(community);

  // 5. User A creates a post in the community
  const postCreateBody = {
    title: "Sample post title",
    body: "This is the body of the sample post.",
    reddit_community_content_type_id: contentType.id,
    status: "active",
    image_uri: null,
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

  // 6. User A adds a comment
  const commentBodyOriginal = "This is the original comment.";
  const commentCreateBody = {
    body: commentBodyOriginal,
  } satisfies IRedditCommunityComment.ICreate;
  const comment: IRedditCommunityComment =
    await api.functional.redditCommunity.user.communities.posts.comments.create(
      connection,
      {
        communityName: community.name,
        postId: post.id,
        body: commentCreateBody,
      },
    );
  typia.assert(comment);

  // 7. User A updates the comment
  const updatedCommentBody = "This is the updated comment content.";
  const commentUpdateBody = {
    body: updatedCommentBody,
  } satisfies IRedditCommunityComment.IUpdate;
  const updatedComment: IRedditCommunityComment =
    await api.functional.redditCommunity.user.communities.posts.comments.update(
      connection,
      {
        communityName: community.name,
        postId: post.id,
        commentId: comment.id,
        body: commentUpdateBody,
      },
    );
  typia.assert(updatedComment);

  // 8. Validate updated content
  TestValidator.equals(
    "updated comment body",
    updatedComment.body,
    updatedCommentBody,
  );

  // 9. User B attempts to update User A's comment, expect error
  // Switch to User B: login
  const userBLoginBody = {
    email: userBEmail,
    password: "ValidPass456!",
    href: "http://localhost/pageB",
    referrer: "http://localhost/referrerB",
  } satisfies IRedditCommunityUser.ILogin;
  await api.functional.auth.user.login(connection, {
    body: userBLoginBody,
  });

  await TestValidator.error(
    "unauthorized user cannot update another's comment",
    async () => {
      await api.functional.redditCommunity.user.communities.posts.comments.update(
        connection,
        {
          communityName: community.name,
          postId: post.id,
          commentId: comment.id,
          body: {
            body: "Trying to update someone else's comment",
          } satisfies IRedditCommunityComment.IUpdate,
        },
      );
    },
  );
}
