import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityForumAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumAuthorizationToken";
import type { ICommunityForumCommunityGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityGroup";
import type { ICommunityForumCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityPost";
import type { ICommunityForumCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityUser";
import type { ICommunityForumPostComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumPostComment";
import type { ICommunityForumPostCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumPostCommentVote";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityForumPostComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityForumPostComment";

export async function test_api_post_comments_sorting_by_top(
  connection: api.IConnection,
) {
  // Step 1: Create first user (author of the post and some comments)
  const user1Join = {
    email: `${RandomGenerator.alphabets(10)}@test.com`,
    password: "password123",
    username:
      RandomGenerator.name(1)
        .replace(/[^a-zA-Z0-9_]/g, "")
        .substring(0, 20) || "user1",
  } satisfies ICommunityForumCommunityUser.IJoin;

  const user1: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: user1Join,
    });
  typia.assert(user1);

  // Step 2: Create second user (author of other comments)
  const user2Join = {
    email: `${RandomGenerator.alphabets(10)}@test.com`,
    password: "password123",
    username:
      RandomGenerator.name(1)
        .replace(/[^a-zA-Z0-9_]/g, "")
        .substring(0, 20) || "user2",
  } satisfies ICommunityForumCommunityUser.IJoin;

  const user2: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: user2Join,
    });
  typia.assert(user2);

  // Step 3: Create a community using user1
  const communityCreate = {
    name:
      RandomGenerator.name(2)
        .replace(/[^a-zA-Z0-9]/g, "")
        .substring(0, 30) || "test_community",
    slug: RandomGenerator.alphabets(8),
    title: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    rules: RandomGenerator.paragraph({ sentences: 3 }),
    privacy_level: "public",
    status: "active",
  } satisfies ICommunityForumCommunityGroup.ICreate;

  const community: ICommunityForumCommunityGroup =
    await api.functional.communityForum.user.communities.create(connection, {
      body: communityCreate,
    });
  typia.assert(community);

  // Step 4: Create a post in the community using user1
  const postCreate = {
    community_forum_community_id: community.id,
    title: RandomGenerator.name(5),
    type: "text" as const,
    body: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies ICommunityForumCommunityPost.ICreate;

  const post: ICommunityForumCommunityPost =
    await api.functional.communityForum.user.posts.create(connection, {
      body: postCreate,
    });
  typia.assert(post);

  // Step 5: Create first comment using user1
  const comment1Create = {
    body: RandomGenerator.paragraph({ sentences: 3 }),
    href: "http://localhost/post/1",
    referrer: "http://localhost/",
  } satisfies ICommunityForumPostComment.ICreate;

  const comment1: ICommunityForumPostComment =
    await api.functional.communityForum.user.posts.comments.create(connection, {
      postId: post.id,
      body: comment1Create,
    });
  typia.assert(comment1);

  // Step 6: Create second comment using user2
  // Re-authenticate as user2
  await api.functional.auth.user.join(connection, {
    body: user2Join,
  });

  const comment2Create = {
    body: RandomGenerator.paragraph({ sentences: 3 }),
    href: "http://localhost/post/1",
    referrer: "http://localhost/",
  } satisfies ICommunityForumPostComment.ICreate;

  const comment2: ICommunityForumPostComment =
    await api.functional.communityForum.user.posts.comments.create(connection, {
      postId: post.id,
      body: comment2Create,
    });
  typia.assert(comment2);

  // Step 7: Create third comment using user1
  // Re-authenticate as user1
  await api.functional.auth.user.join(connection, {
    body: user1Join,
  });

  const comment3Create = {
    body: RandomGenerator.paragraph({ sentences: 3 }),
    href: "http://localhost/post/1",
    referrer: "http://localhost/",
  } satisfies ICommunityForumPostComment.ICreate;

  const comment3: ICommunityForumPostComment =
    await api.functional.communityForum.user.posts.comments.create(connection, {
      postId: post.id,
      body: comment3Create,
    });
  typia.assert(comment3);

  // Step 8: Upvote first comment to affect sorting
  // Re-authenticate as user2 to vote
  await api.functional.auth.user.join(connection, {
    body: user2Join,
  });

  const voteCreate = {
    is_upvote: true,
  } satisfies ICommunityForumPostCommentVote.ICreate;

  const vote: ICommunityForumPostCommentVote =
    await api.functional.communityForum.user.comments.votes.create(connection, {
      commentId: comment1.id,
      body: voteCreate,
    });
  typia.assert(vote);

  // Step 9: Retrieve comments sorted by top (vote score)
  // Re-authenticate as user1
  await api.functional.auth.user.join(connection, {
    body: user1Join,
  });

  const commentsPage: IPageICommunityForumPostComment =
    await api.functional.communityForum.posts.comments.index(connection, {
      postId: post.id,
      body: {
        sort: "top",
      },
    });
  typia.assert(commentsPage);

  // Step 10: Validate that comments are sorted by vote score (top)
  // The first comment should be comment1 since it has 1 upvote
  // The other comments should have 0 upvotes
  TestValidator.equals(
    "first comment should be the one with highest vote score",
    commentsPage.data[0].id,
    comment1.id,
  );

  // Validate that we have exactly 3 comments
  TestValidator.equals(
    "should have exactly 3 comments",
    commentsPage.data.length,
    3,
  );

  // Validate pagination information
  TestValidator.equals(
    "pagination current page should be 1",
    commentsPage.pagination.current,
    1,
  );

  TestValidator.equals(
    "pagination limit should be default (20)",
    commentsPage.pagination.limit,
    20,
  );

  TestValidator.equals(
    "pagination records should be 3",
    commentsPage.pagination.records,
    3,
  );

  TestValidator.equals(
    "pagination pages should be 1",
    commentsPage.pagination.pages,
    1,
  );
}
