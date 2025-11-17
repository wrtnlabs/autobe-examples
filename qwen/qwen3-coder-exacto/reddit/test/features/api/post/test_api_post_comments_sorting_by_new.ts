import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityForumAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumAuthorizationToken";
import type { ICommunityForumCommunityGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityGroup";
import type { ICommunityForumCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityPost";
import type { ICommunityForumCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityUser";
import type { ICommunityForumPostComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumPostComment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityForumPostComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityForumPostComment";

export async function test_api_post_comments_sorting_by_new(
  connection: api.IConnection,
) {
  // Step 1: Create first user (author of post and comments)
  const user1: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: "user1@example.com",
        password: "password123",
        username: "user1",
      } satisfies ICommunityForumCommunityUser.IJoin,
    });
  typia.assert(user1);

  // Step 2: Create a community
  const community: ICommunityForumCommunityGroup =
    await api.functional.communityForum.user.communities.create(connection, {
      body: {
        name: "Test Community",
        slug: "test-community",
        title: "Test Community Title",
        description: "A community for testing purposes",
        rules: "Be respectful",
        privacy_level: "public",
        status: "active",
      } satisfies ICommunityForumCommunityGroup.ICreate,
    });
  typia.assert(community);

  // Step 3: Create a post in the community
  const post: ICommunityForumCommunityPost =
    await api.functional.communityForum.user.posts.create(connection, {
      body: {
        community_forum_community_id: community.id,
        title: "Test Post for Comment Sorting",
        type: "text",
        body: "This is a test post to validate comment sorting functionality.",
      } satisfies ICommunityForumCommunityPost.ICreate,
    });
  typia.assert(post);

  // Step 4: Create first comment
  const comment1: ICommunityForumPostComment =
    await api.functional.communityForum.user.posts.comments.create(connection, {
      postId: post.id,
      body: {
        body: "First comment on the post",
        href: "http://localhost/post/1",
        referrer: "http://localhost/",
      } satisfies ICommunityForumPostComment.ICreate,
    });
  typia.assert(comment1);

  // Small delay to ensure different timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Step 5: Create second comment
  const comment2: ICommunityForumPostComment =
    await api.functional.communityForum.user.posts.comments.create(connection, {
      postId: post.id,
      body: {
        body: "Second comment on the post",
        href: "http://localhost/post/1",
        referrer: "http://localhost/",
      } satisfies ICommunityForumPostComment.ICreate,
    });
  typia.assert(comment2);

  // Small delay to ensure different timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Step 6: Create third comment
  const comment3: ICommunityForumPostComment =
    await api.functional.communityForum.user.posts.comments.create(connection, {
      postId: post.id,
      body: {
        body: "Third comment on the post",
        href: "http://localhost/post/1",
        referrer: "http://localhost/",
      } satisfies ICommunityForumPostComment.ICreate,
    });
  typia.assert(comment3);

  // Step 7: Retrieve comments sorted by 'new' (newest first)
  const commentsPage: IPageICommunityForumPostComment =
    await api.functional.communityForum.posts.comments.index(connection, {
      postId: post.id,
      body: {
        sort: "new",
      } satisfies ICommunityForumPostComment.IRequest,
    });
  typia.assert(commentsPage);

  // Step 8: Validate that comments are sorted by creation date (newest first)
  TestValidator.predicate("comments should be sorted by newest first", () => {
    const comments = commentsPage.data;
    // Check that we have 3 comments
    if (comments.length !== 3) return false;

    // Check sorting order (newest first)
    for (let i = 0; i < comments.length - 1; i++) {
      const current = new Date(comments[i].created_at);
      const next = new Date(comments[i + 1].created_at);
      // Each comment should be created at or after the next one (newest first)
      if (current < next) return false;
    }
    return true;
  });

  // Step 9: Validate that the comments are in the expected order (third, second, first)
  // Based on creation timestamps, not just sequence
  const sortedComments = [comment1, comment2, comment3].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  TestValidator.equals(
    "comments should be ordered by creation timestamp (newest first)",
    commentsPage.data.map((comment) => comment.body),
    sortedComments.map((comment) => comment.body),
  );
}
