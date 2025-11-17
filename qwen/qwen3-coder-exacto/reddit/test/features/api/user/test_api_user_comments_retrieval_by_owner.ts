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

export async function test_api_user_comments_retrieval_by_owner(
  connection: api.IConnection,
) {
  // Step 1: Create a user through registration
  const userJoinData = {
    email: "testuser@example.com",
    password: "password123",
    username: "testuser_comments_owner",
  } satisfies ICommunityForumCommunityUser.IJoin;

  const user: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: userJoinData,
    });
  typia.assert(user);

  // Step 2: Create a community under the user
  const communityData = {
    name: "Test Community for Comments",
    slug: "test-comments-community",
    title: "Test Community Title",
    description:
      "A test community for validating comment retrieval functionality",
    rules: "Be respectful and follow community guidelines",
    privacy_level: "public",
    status: "active",
  } satisfies ICommunityForumCommunityGroup.ICreate;

  const community: ICommunityForumCommunityGroup =
    await api.functional.communityForum.user.communities.create(connection, {
      body: communityData,
    });
  typia.assert(community);

  // Step 3: Create a post in the community
  const postData = {
    community_forum_community_id: community.id,
    title: "Test Post for Comment Retrieval",
    type: "text",
    body: "This is a test post to validate comment creation and retrieval functionality.",
  } satisfies ICommunityForumCommunityPost.ICreate;

  const post: ICommunityForumCommunityPost =
    await api.functional.communityForum.user.posts.create(connection, {
      body: postData,
    });
  typia.assert(post);

  // Step 4: Create multiple comments on the post
  const commentBodies = [
    "This is the first test comment on the post.",
    "This is the second test comment with more content to validate retrieval.",
    "This is the third comment to ensure pagination works correctly.",
  ];

  const comments: ICommunityForumPostComment[] = [];
  for (const body of commentBodies) {
    const commentData = {
      body,
      href: "http://localhost:3000/test-post",
      referrer: "http://localhost:3000/",
    } satisfies ICommunityForumPostComment.ICreate;

    const comment: ICommunityForumPostComment =
      await api.functional.communityForum.user.posts.comments.create(
        connection,
        {
          postId: post.id,
          body: commentData,
        },
      );
    typia.assert(comment);
    comments.push(comment);
  }

  // Step 5: Retrieve comments by the user (owner)
  const commentRequest = {
    page: 1,
    limit: 10,
    sort: "new" as const,
  } satisfies ICommunityForumPostComment.IRequest;

  const retrievedComments: IPageICommunityForumPostComment.ISummary =
    await api.functional.communityForum.users.comments.index(connection, {
      username: user.username,
      body: commentRequest,
    });
  typia.assert(retrievedComments);

  // Step 6: Validate the retrieved comments
  TestValidator.equals(
    "retrieved comment count should match created comments",
    retrievedComments.pagination.records,
    comments.length,
  );

  TestValidator.equals(
    "retrieved comments should match created comments by ID",
    retrievedComments.data.map((c) => c.id).sort(),
    comments.map((c) => c.id).sort(),
  );

  // Step 7: Validate comment content and authorship
  TestValidator.predicate(
    "all retrieved comments should have the same author",
    () => retrievedComments.data.every((c) => c.author.id === user.id),
  );

  // Step 8: Test pagination with a smaller limit
  const paginatedRequest = {
    page: 1,
    limit: 2,
    sort: "new" as const,
  } satisfies ICommunityForumPostComment.IRequest;

  const paginatedComments: IPageICommunityForumPostComment.ISummary =
    await api.functional.communityForum.users.comments.index(connection, {
      username: user.username,
      body: paginatedRequest,
    });
  typia.assert(paginatedComments);

  TestValidator.equals(
    "paginated results should respect limit",
    paginatedComments.data.length,
    2,
  );

  TestValidator.equals(
    "pagination should show correct total count",
    paginatedComments.pagination.records,
    comments.length,
  );

  // Step 9: Test sorting by 'new' (default)
  const sortedRequest = {
    page: 1,
    limit: 10,
    sort: "new" as const,
  } satisfies ICommunityForumPostComment.IRequest;

  const sortedComments: IPageICommunityForumPostComment.ISummary =
    await api.functional.communityForum.users.comments.index(connection, {
      username: user.username,
      body: sortedRequest,
    });
  typia.assert(sortedComments);

  // Verify that comments are sorted by creation date in descending order (newest first)
  for (let i = 0; i < sortedComments.data.length - 1; i++) {
    const current = new Date(sortedComments.data[i].created_at);
    const next = new Date(sortedComments.data[i + 1].created_at);
    TestValidator.predicate(
      `comment ${i} should be newer than comment ${i + 1}`,
      () => current >= next,
    );
  }
}
