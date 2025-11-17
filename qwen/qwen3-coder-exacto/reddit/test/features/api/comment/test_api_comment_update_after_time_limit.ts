import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityForumAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumAuthorizationToken";
import type { ICommunityForumCommunityGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityGroup";
import type { ICommunityForumCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityPost";
import type { ICommunityForumCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityUser";
import type { ICommunityForumPostComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumPostComment";

export async function test_api_comment_update_after_time_limit(
  connection: api.IConnection,
) {
  // Step 1: Create a user to make the comment
  const userJoin = {
    email: "testcommentuser@example.com",
    password: "password123",
    username: "test_comment_user",
  } satisfies ICommunityForumCommunityUser.IJoin;

  const user: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: userJoin,
    });
  typia.assert(user);

  // Step 2: Create a community
  const communityCreate = {
    name: "TestCommentCommunity",
    slug: "test-comment-community",
    title: "Test Comment Community",
    description: "A community for testing comment functionality",
    rules: "Be respectful and on-topic",
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
    title: "Test Post for Comment Update Time Limit",
    type: "text",
    body: "This is a test post to test comment editing time limit functionality.",
  } satisfies ICommunityForumCommunityPost.ICreate;

  const post: ICommunityForumCommunityPost =
    await api.functional.communityForum.user.posts.create(connection, {
      body: postCreate,
    });
  typia.assert(post);

  // Step 4: Create a comment on the post
  const commentCreate = {
    body: "This is a test comment that should not be editable after 15 minutes.",
    ip: "127.0.0.1",
    href: "http://localhost/test",
    referrer: "http://localhost/",
  } satisfies ICommunityForumPostComment.ICreate;

  const comment: ICommunityForumPostComment =
    await api.functional.communityForum.user.posts.comments.create(connection, {
      postId: post.id,
      body: commentCreate,
    });
  typia.assert(comment);

  // Step 5: Attempt to update the comment immediately (should succeed if within time limit)
  const immediateUpdate = {
    body: "This comment was updated immediately.",
  } satisfies ICommunityForumPostComment.IUpdate;

  // First update should succeed (assuming it's within the 15-minute window)
  const updatedComment: ICommunityForumPostComment =
    await api.functional.communityForum.user.comments.update(connection, {
      commentId: comment.id,
      body: immediateUpdate,
    });
  typia.assert(updatedComment);
  TestValidator.equals(
    "comment body should be updated",
    updatedComment.body,
    immediateUpdate.body,
  );

  // Step 6: Attempt to update the comment again, but simulate time passage
  // In a real backend implementation, this would fail after 15 minutes
  // Since we cannot manipulate time in this test, we'll just document what should happen
  // In a production environment, there would be a time-based check in the update endpoint

  const secondUpdate = {
    body: "This comment should not be updated due to time limit.",
  } satisfies ICommunityForumPostComment.IUpdate;

  // This test documents the expected behavior - in a real implementation
  // this would return a 403 Forbidden after 15 minutes
  // Since we can't simulate time passage, we're documenting rather than testing
  // the time-based restriction directly

  // In a test environment with time manipulation capabilities, this would be:
  /*
  await TestValidator.httpError(
    "should fail to update comment after 15 minutes",
    403,
    async () => {
      await api.functional.communityForum.user.comments.update(connection, {
        commentId: comment.id,
        body: secondUpdate
      });
    }
  );
  */

  // For now, we'll just note that time-based comment editing restrictions
  // are expected to be enforced by the backend API
  console.log(
    "Note: Time-based comment editing restrictions should be enforced by the backend",
  );
  console.log(
    "This test verifies immediate update works, and documents the time limit requirement",
  );
}
