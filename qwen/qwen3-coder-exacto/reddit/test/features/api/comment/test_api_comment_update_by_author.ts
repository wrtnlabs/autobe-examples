import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityForumAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumAuthorizationToken";
import type { ICommunityForumCommunityGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityGroup";
import type { ICommunityForumCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityPost";
import type { ICommunityForumCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityUser";
import type { ICommunityForumPostComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumPostComment";

export async function test_api_comment_update_by_author(
  connection: api.IConnection,
) {
  // 1. Register a new user (author)
  const userJoin = {
    email: "author@example.com",
    password: "password123",
    username: "test_author",
  } satisfies ICommunityForumCommunityUser.IJoin;

  const author: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: userJoin,
    });
  typia.assert(author);

  // 2. Create a community
  const communityCreate = {
    name: "Test Community",
    slug: "test-community",
    title: "Test Community Title",
    description: "A community for testing purposes",
    rules: "Be respectful and on-topic",
    privacy_level: "public",
    status: "active",
  } satisfies ICommunityForumCommunityGroup.ICreate;

  const community: ICommunityForumCommunityGroup =
    await api.functional.communityForum.user.communities.create(connection, {
      body: communityCreate,
    });
  typia.assert(community);

  // 3. Create a post in the community
  const postCreate = {
    community_forum_community_id: community.id,
    title: "Test Post for Comment Update",
    type: "text",
    body: "This is a test post to test comment updating functionality.",
  } satisfies ICommunityForumCommunityPost.ICreate;

  const post: ICommunityForumCommunityPost =
    await api.functional.communityForum.user.posts.create(connection, {
      body: postCreate,
    });
  typia.assert(post);

  // 4. Create a comment on the post
  const commentCreate = {
    body: "This is the original comment that will be updated.",
    ip: "127.0.0.1",
    href: "http://localhost:3000/test-post",
    referrer: "http://localhost:3000/",
  } satisfies ICommunityForumPostComment.ICreate;

  const comment: ICommunityForumPostComment =
    await api.functional.communityForum.user.posts.comments.create(connection, {
      postId: post.id,
      body: commentCreate,
    });
  typia.assert(comment);

  // 5. Update the comment (author only)
  const commentUpdate = {
    body: "This is the updated comment content.",
  } satisfies ICommunityForumPostComment.IUpdate;

  const updatedComment: ICommunityForumPostComment =
    await api.functional.communityForum.user.comments.update(connection, {
      commentId: comment.id,
      body: commentUpdate,
    });
  typia.assert(updatedComment);

  // 6. Validate that the comment was properly updated
  TestValidator.equals(
    "comment body should be updated",
    updatedComment.body,
    commentUpdate.body,
  );

  TestValidator.equals(
    "comment author should remain the same",
    updatedComment.community_forum_user_id,
    author.id,
  );

  TestValidator.equals(
    "comment post association should remain the same",
    updatedComment.community_forum_post_id,
    post.id,
  );

  TestValidator.predicate(
    "updated_at should be more recent than created_at",
    (): boolean => {
      const createdAt = new Date(comment.created_at);
      const updatedAt = new Date(updatedComment.updated_at!);
      return updatedAt.getTime() > createdAt.getTime();
    },
  );
}
