import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneComment";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneKarmaScore";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import type { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import type { IRedditClonePostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostText";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_communities_create } from "../../../generate/generate_random_reddit_clone_communities_create";
import { generate_random_reddit_clone_member_posts_comments_create } from "../../../generate/generate_random_reddit_clone_member_posts_comments_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { prepare_random_reddit_clone_comment } from "../../../prepare/prepare_random_reddit_clone_comment";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";
import { prepare_random_reddit_clone_post_image } from "../../../prepare/prepare_random_reddit_clone_post_image";
import { prepare_random_reddit_clone_post_link } from "../../../prepare/prepare_random_reddit_clone_post_link";
import { prepare_random_reddit_clone_post_text } from "../../../prepare/prepare_random_reddit_clone_post_text";

/**
 * Test that soft-deleted comments are excluded from member comment history results.
 *
 * This test verifies the soft-delete exclusion behavior for the comment history endpoint.
 * It creates multiple comments, deletes some of them, and validates that only non-deleted
 * comments appear in the comment history results with correct pagination metadata.
 */
export async function test_api_member_comment_excludes_soft_deleted(
  connection: api.IConnection,
): Promise<void> {
  // =========================================================================
  // SETUP: Create member A (viewer) and member B (comment author)
  // =========================================================================
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(memberA);
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(memberB);
  // =========================================================================
  // SETUP: Create community owned by member A
  // =========================================================================
  const community = await generate_random_reddit_clone_communities_create(
    memberAConnection,
    {
      body: {
        name: RandomGenerator.alphabets(10),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(community);
  // =========================================================================
  // SETUP: Create post in the community by member A
  // =========================================================================
  const post = await generate_random_reddit_clone_member_posts_create(
    memberAConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "TEXT",
        community_id: community.id,
        text: {
          body: RandomGenerator.content({ paragraphs: 2 }),
        },
      },
    },
  );
  typia.assert(post);
  // =========================================================================
  // SETUP: Create 5 comments by member B on the post
  // =========================================================================
  const allComments: IRedditCloneComment[] = [];
  for (let i = 0; i < 5; i++) {
    const comment =
      await generate_random_reddit_clone_member_posts_comments_create(
        memberBConnection,
        {
          params: { postId: post.id },
          body: {
            body: RandomGenerator.paragraph({ sentences: 2 }),
          },
        },
      );
    typia.assert(comment);
    allComments.push(comment);
  }
  // =========================================================================
  // DELETE: Member B deletes 2 comments (indices 0 and 2)
  // =========================================================================
  const commentsToDelete = [allComments[0], allComments[2]];
  for (const comment of commentsToDelete) {
    await api.functional.redditClone.member.posts.comments.erase(
      memberBConnection,
      {
        postId: post.id,
        commentId: comment.id,
      },
    );
  }
  // =========================================================================
  // TEST: Member A retrieves member B's comment history
  // =========================================================================
  const commentHistory =
    await api.functional.redditClone.member.members.comments.index(
      memberAConnection,
      {
        memberId: memberB.id,
        body: {
          page: 1,
          limit: 20,
          sort: "new",
        } satisfies IRedditCloneComment.IRequest,
      },
    );
  typia.assert(commentHistory);
  // =========================================================================
  // VALIDATE: Only non-deleted comments appear (3 comments, not 5)
  // =========================================================================
  TestValidator.equals(
    "comment count should exclude deleted comments",
    commentHistory.data.length,
    3,
  );
  TestValidator.equals(
    "pagination records should reflect non-deleted count",
    commentHistory.pagination.records,
    3,
  );
  TestValidator.equals(
    "pagination pages should be correct",
    commentHistory.pagination.pages,
    1,
  );
  // Verify deleted comment IDs do not appear in results
  const deletedCommentIds = commentsToDelete.map((c) => c.id);
  const resultCommentIds = commentHistory.data.map((c) => c.id);
  for (const deletedId of deletedCommentIds) {
    TestValidator.predicate(
      `deleted comment ${deletedId} should not appear in results`,
      !resultCommentIds.includes(deletedId),
    );
  }
  // =========================================================================
  // TEST: Reply comment cascade deletion behavior
  // =========================================================================
  // Create a parent comment
  const parentComment =
    await generate_random_reddit_clone_member_posts_comments_create(
      memberBConnection,
      {
        params: { postId: post.id },
        body: {
          body: RandomGenerator.paragraph({ sentences: 1 }),
        },
      },
    );
  typia.assert(parentComment);
  // Create a reply to the parent comment
  const replyComment =
    await generate_random_reddit_clone_member_posts_comments_create(
      memberBConnection,
      {
        params: { postId: post.id },
        body: {
          body: RandomGenerator.paragraph({ sentences: 1 }),
          parent_comment_id: parentComment.id,
        },
      },
    );
  typia.assert(replyComment);
  // Delete the parent comment (should cascade delete the reply)
  await api.functional.redditClone.member.posts.comments.erase(
    memberBConnection,
    {
      postId: post.id,
      commentId: parentComment.id,
    },
  );
  // Verify both parent and reply are excluded from comment history
  const commentHistoryAfterCascade =
    await api.functional.redditClone.member.members.comments.index(
      memberAConnection,
      {
        memberId: memberB.id,
        body: {
          page: 1,
          limit: 20,
          sort: "new",
        } satisfies IRedditCloneComment.IRequest,
      },
    );
  typia.assert(commentHistoryAfterCascade);
  TestValidator.equals(
    "comment count after cascade deletion",
    commentHistoryAfterCascade.data.length,
    3,
  );
  TestValidator.predicate(
    "parent comment should not appear after deletion",
    !commentHistoryAfterCascade.data.some((c) => c.id === parentComment.id),
  );
  TestValidator.predicate(
    "reply comment should not appear after parent deletion (cascade)",
    !commentHistoryAfterCascade.data.some((c) => c.id === replyComment.id),
  );
  // =========================================================================
  // TEST: Mixed content across multiple posts
  // =========================================================================
  // Create a second post
  const post2 = await generate_random_reddit_clone_member_posts_create(
    memberAConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "TEXT",
        community_id: community.id,
        text: {
          body: RandomGenerator.content({ paragraphs: 1 }),
        },
      },
    },
  );
  typia.assert(post2);
  // Create 3 comments on post2 by member B
  const post2Comments: IRedditCloneComment[] = [];
  for (let i = 0; i < 3; i++) {
    const comment =
      await generate_random_reddit_clone_member_posts_comments_create(
        memberBConnection,
        {
          params: { postId: post2.id },
          body: {
            body: RandomGenerator.paragraph({ sentences: 2 }),
          },
        },
      );
    typia.assert(comment);
    post2Comments.push(comment);
  }
  // Delete 1 comment from post2
  await api.functional.redditClone.member.posts.comments.erase(
    memberBConnection,
    {
      postId: post2.id,
      commentId: post2Comments[0].id,
    },
  );
  // Verify comment history across all posts
  const finalCommentHistory =
    await api.functional.redditClone.member.members.comments.index(
      memberAConnection,
      {
        memberId: memberB.id,
        body: {
          page: 1,
          limit: 20,
          sort: "new",
        } satisfies IRedditCloneComment.IRequest,
      },
    );
  typia.assert(finalCommentHistory);
  // Expected: 3 (from post1) + 2 (from post2) = 5 total non-deleted comments
  TestValidator.equals(
    "total comment count across multiple posts",
    finalCommentHistory.data.length,
    5,
  );
  TestValidator.equals(
    "pagination records across multiple posts",
    finalCommentHistory.pagination.records,
    5,
  );
  // Verify deleted comment from post2 is excluded
  TestValidator.predicate(
    "deleted comment from post2 should not appear",
    !finalCommentHistory.data.some((c) => c.id === post2Comments[0].id),
  );
  // Verify all remaining comments are from member B
  for (const comment of finalCommentHistory.data) {
    TestValidator.equals(
      "all comments should be authored by member B",
      comment.author.id,
      memberB.id,
    );
  }
}
