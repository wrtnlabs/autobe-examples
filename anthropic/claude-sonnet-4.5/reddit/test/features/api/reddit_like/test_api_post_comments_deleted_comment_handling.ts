import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeComment";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

export async function test_api_post_comments_deleted_comment_handling(
  connection: api.IConnection,
) {
  // Step 1: Create member account for comment author
  const authorEmail = typia.random<string & tags.Format<"email">>();
  const author = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(12),
      email: authorEmail,
      password: typia.random<string & tags.MinLength<8>>(),
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(author);

  // Step 2: Create community for hosting the post
  const community = await api.functional.redditLike.member.communities.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        privacy_type: "public",
        posting_permission: "anyone_subscribed",
        allow_text_posts: true,
        allow_link_posts: true,
        allow_image_posts: true,
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);

  // Step 3: Create a post to host the comment thread
  const post = await api.functional.redditLike.member.posts.create(connection, {
    body: {
      community_id: community.id,
      type: "text",
      title: RandomGenerator.paragraph({ sentences: 2 }),
      body: RandomGenerator.content({ paragraphs: 2 }),
    } satisfies IRedditLikePost.ICreate,
  });
  typia.assert(post);

  // Step 4: Build nested comment thread
  // Create parent comment 1
  const parentComment1 =
    await api.functional.redditLike.member.posts.comments.create(connection, {
      postId: post.id,
      body: {
        reddit_like_post_id: post.id,
        content_text: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditLikeComment.ICreate,
    });
  typia.assert(parentComment1);

  // Create child reply to parent comment 1
  const childComment1 =
    await api.functional.redditLike.member.posts.comments.create(connection, {
      postId: post.id,
      body: {
        reddit_like_post_id: post.id,
        reddit_like_parent_comment_id: parentComment1.id,
        content_text: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditLikeComment.ICreate,
    });
  typia.assert(childComment1);

  // Create parent comment 2 (this will be deleted)
  const parentComment2 =
    await api.functional.redditLike.member.posts.comments.create(connection, {
      postId: post.id,
      body: {
        reddit_like_post_id: post.id,
        content_text: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditLikeComment.ICreate,
    });
  typia.assert(parentComment2);

  // Create child reply to parent comment 2 (parent will be deleted)
  const childComment2 =
    await api.functional.redditLike.member.posts.comments.create(connection, {
      postId: post.id,
      body: {
        reddit_like_post_id: post.id,
        reddit_like_parent_comment_id: parentComment2.id,
        content_text: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditLikeComment.ICreate,
    });
  typia.assert(childComment2);

  // Create nested reply to child comment 2
  const nestedComment =
    await api.functional.redditLike.member.posts.comments.create(connection, {
      postId: post.id,
      body: {
        reddit_like_post_id: post.id,
        reddit_like_parent_comment_id: childComment2.id,
        content_text: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditLikeComment.ICreate,
    });
  typia.assert(nestedComment);

  // Step 5: Delete parent comment 2 (author deletion)
  await api.functional.redditLike.member.comments.erase(connection, {
    commentId: parentComment2.id,
  });

  // Step 6: Retrieve the comment thread
  const commentsPage = await api.functional.redditLike.posts.comments.index(
    connection,
    {
      postId: post.id,
      body: {
        page: 1,
        limit: 50,
        sort_by: "new",
      } satisfies IRedditLikeComment.IRequest,
    },
  );
  typia.assert(commentsPage);

  // Step 7: Validate thread structure is preserved
  TestValidator.predicate(
    "comments should be retrieved",
    commentsPage.data.length > 0,
  );

  // Step 8: Verify child replies to deleted parent remain visible
  const retrievedChildComment2 = commentsPage.data.find(
    (c) => c.id === childComment2.id,
  );
  TestValidator.predicate(
    "child reply to deleted parent should remain visible",
    retrievedChildComment2 !== undefined,
  );

  const retrievedNestedComment = commentsPage.data.find(
    (c) => c.id === nestedComment.id,
  );
  TestValidator.predicate(
    "nested reply should remain visible",
    retrievedNestedComment !== undefined,
  );

  // Step 9: Confirm thread hierarchy is maintained
  if (retrievedChildComment2) {
    TestValidator.equals(
      "child comment should maintain parent reference",
      retrievedChildComment2.reddit_like_parent_comment_id,
      parentComment2.id,
    );
  }

  if (retrievedNestedComment) {
    TestValidator.equals(
      "nested comment should maintain parent reference",
      retrievedNestedComment.reddit_like_parent_comment_id,
      childComment2.id,
    );
  }

  // Step 10: Verify non-deleted comments remain intact
  const retrievedParentComment1 = commentsPage.data.find(
    (c) => c.id === parentComment1.id,
  );
  TestValidator.predicate(
    "non-deleted parent comment should be visible",
    retrievedParentComment1 !== undefined,
  );

  const retrievedChildComment1 = commentsPage.data.find(
    (c) => c.id === childComment1.id,
  );
  TestValidator.predicate(
    "non-deleted child comment should be visible",
    retrievedChildComment1 !== undefined,
  );
}
