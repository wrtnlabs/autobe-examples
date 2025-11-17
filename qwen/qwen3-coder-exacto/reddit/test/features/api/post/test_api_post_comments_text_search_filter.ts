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

export async function test_api_post_comments_text_search_filter(
  connection: api.IConnection,
) {
  // Step 1: Create first user (author of post and some comments)
  const user1Join = {
    email: "user1@example.com",
    password: "password123",
    username: "user1",
  } satisfies ICommunityForumCommunityUser.IJoin;

  const user1: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: user1Join,
    });
  typia.assert(user1);

  // Step 2: Create second user (author of other comments)
  const user2Join = {
    email: "user2@example.com",
    password: "password123",
    username: "user2",
  } satisfies ICommunityForumCommunityUser.IJoin;

  const user2: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: user2Join,
    });
  typia.assert(user2);

  // Step 3: Create a community
  const communityCreate = {
    name: "test-community",
    slug: "test-community",
    title: "Test Community",
    description: "A community for testing",
    rules: "Be respectful",
    privacy_level: "public",
    status: "active",
  } satisfies ICommunityForumCommunityGroup.ICreate;

  const community: ICommunityForumCommunityGroup =
    await api.functional.communityForum.user.communities.create(connection, {
      body: communityCreate,
    });
  typia.assert(community);

  // Step 4: Create a post in the community
  const postCreate = {
    community_forum_community_id: community.id,
    title: "Test Post for Comment Search",
    type: "text",
    body: "This is a test post to test comment search functionality.",
  } satisfies ICommunityForumCommunityPost.ICreate;

  const post: ICommunityForumCommunityPost =
    await api.functional.communityForum.user.posts.create(connection, {
      body: postCreate,
    });
  typia.assert(post);

  // Step 5: Create comments with specific content - some containing search term
  const searchTerm = "important";

  // Comment 1 - contains search term
  const comment1Create = {
    body: `This is an ${searchTerm} comment that should appear in search results`,
    href: "http://localhost/test",
    referrer: "http://localhost/referrer",
  } satisfies ICommunityForumPostComment.ICreate;

  const comment1: ICommunityForumPostComment =
    await api.functional.communityForum.user.posts.comments.create(connection, {
      postId: post.id,
      body: comment1Create,
    });
  typia.assert(comment1);

  // Comment 2 - contains search term
  const comment2Create = {
    body: `Another ${searchTerm} comment for testing search filtering`,
    href: "http://localhost/test",
    referrer: "http://localhost/referrer",
  } satisfies ICommunityForumPostComment.ICreate;

  const comment2: ICommunityForumPostComment =
    await api.functional.communityForum.user.posts.comments.create(connection, {
      postId: post.id,
      body: comment2Create,
    });
  typia.assert(comment2);

  // Comment 3 - does NOT contain search term
  const comment3Create = {
    body: "This comment should not appear in search results as it doesn't contain the search term",
    href: "http://localhost/test",
    referrer: "http://localhost/referrer",
  } satisfies ICommunityForumPostComment.ICreate;

  const comment3: ICommunityForumPostComment =
    await api.functional.communityForum.user.posts.comments.create(connection, {
      postId: post.id,
      body: comment3Create,
    });
  typia.assert(comment3);

  // Comment 4 - contains search term in different context
  const comment4Create = {
    body: `Comment with ${searchTerm} information in the middle of the text`,
    href: "http://localhost/test",
    referrer: "http://localhost/referrer",
  } satisfies ICommunityForumPostComment.ICreate;

  const comment4: ICommunityForumPostComment =
    await api.functional.communityForum.user.posts.comments.create(connection, {
      postId: post.id,
      body: comment4Create,
    });
  typia.assert(comment4);

  // Comment 5 - does NOT contain search term
  const comment5Create = {
    body: "Yet another comment without the search term we're looking for",
    href: "http://localhost/test",
    referrer: "http://localhost/referrer",
  } satisfies ICommunityForumPostComment.ICreate;

  const comment5: ICommunityForumPostComment =
    await api.functional.communityForum.user.posts.comments.create(connection, {
      postId: post.id,
      body: comment5Create,
    });
  typia.assert(comment5);

  // Step 6: Test text search filtering - should return only comments with search term
  const searchRequest = {
    search: searchTerm,
  } satisfies ICommunityForumPostComment.IRequest;

  const searchResult: IPageICommunityForumPostComment =
    await api.functional.communityForum.posts.comments.index(connection, {
      postId: post.id,
      body: searchRequest,
    });
  typia.assert(searchResult);

  // Step 7: Validate that only comments with the search term are returned
  TestValidator.equals(
    "search result count should be 3 (comments 1, 2, and 4 contain the search term)",
    searchResult.data.length,
    3,
  );

  // Step 8: Validate that all returned comments contain the search term
  TestValidator.predicate(
    "all returned comments should contain the search term",
    () =>
      searchResult.data.every((comment) => comment.body.includes(searchTerm)),
  );

  // Step 9: Validate that the correct comments are returned
  const returnedCommentIds = searchResult.data.map((comment) => comment.id);
  TestValidator.predicate(
    "returned comments should be comments 1, 2, and 4",
    () =>
      returnedCommentIds.includes(comment1.id) &&
      returnedCommentIds.includes(comment2.id) &&
      returnedCommentIds.includes(comment4.id) &&
      !returnedCommentIds.includes(comment3.id) &&
      !returnedCommentIds.includes(comment5.id),
  );
}
