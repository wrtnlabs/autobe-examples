import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityForumAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumAuthorizationToken";
import type { ICommunityForumCommunityGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityGroup";
import type { ICommunityForumCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityPost";
import type { ICommunityForumCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityUser";
import type { ICommunityForumPostComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumPostComment";

export async function test_api_comment_creation_on_post(
  connection: api.IConnection,
) {
  // Step 1: Create first user (author of the post)
  const user1Join = {
    email: "author@test.com",
    password: "password123",
    username: "post_author",
  } satisfies ICommunityForumCommunityUser.IJoin;

  const user1: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: user1Join,
    });
  typia.assert(user1);

  // Step 2: Create a community with the first user
  const communityCreate = {
    name: "Test Community",
    slug: "test-community",
    title: "Test Community Title",
    description: "A community for testing purposes",
    rules: "Be respectful and on topic",
    privacy_level: "public",
    status: "active",
  } satisfies ICommunityForumCommunityGroup.ICreate;

  const community: ICommunityForumCommunityGroup =
    await api.functional.communityForum.user.communities.create(connection, {
      body: communityCreate,
    });
  typia.assert(community);

  // Step 3: Create a post in the community
  const postCreate = {
    community_forum_community_id: community.id,
    title: "Test Post for Comments",
    type: "text",
    body: "This is a test post to verify comment creation functionality.",
  } satisfies ICommunityForumCommunityPost.ICreate;

  const post: ICommunityForumCommunityPost =
    await api.functional.communityForum.user.posts.create(connection, {
      body: postCreate,
    });
  typia.assert(post);

  // Step 4: Create second user (comment author)
  const user2Join = {
    email: "commenter@test.com",
    password: "password123",
    username: "comment_author",
  } satisfies ICommunityForumCommunityUser.IJoin;

  const user2: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: user2Join,
    });
  typia.assert(user2);

  // Step 5: Create a comment on the post
  const commentCreate = {
    body: "This is a test comment on the post.",
    href: "http://localhost:3000/test-post",
    referrer: "http://localhost:3000/community/test-community",
  } satisfies ICommunityForumPostComment.ICreate;

  const comment: ICommunityForumPostComment =
    await api.functional.communityForum.user.posts.comments.create(connection, {
      postId: post.id,
      body: commentCreate,
    });
  typia.assert(comment);

  // Step 6: Validate the comment was created properly
  TestValidator.equals(
    "comment body matches",
    comment.body,
    "This is a test comment on the post.",
  );
  TestValidator.equals(
    "comment is associated with correct post",
    comment.community_forum_post_id,
    post.id,
  );
  TestValidator.equals(
    "comment is associated with correct user",
    comment.community_forum_user_id,
    user2.id,
  );
  TestValidator.predicate(
    "comment has creation timestamp",
    () => comment.created_at !== undefined,
  );
  TestValidator.predicate(
    "comment does not have update timestamp initially",
    () => comment.updated_at === undefined,
  );
  TestValidator.predicate(
    "comment is not deleted",
    () => comment.deleted_at === undefined,
  );
}
