import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneComment";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunitySubscription";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_posts_comments_create } from "../../../generate/generate_random_reddit_clone_member_posts_comments_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_comment } from "../../../prepare/prepare_random_reddit_clone_comment";
import { prepare_random_reddit_clone_community_subscription } from "../../../prepare/prepare_random_reddit_clone_community_subscription";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";

/**
 * Test retrieving comments for a post with threaded replies and validate comment structure.
 *
 * Validates the complete comment listing workflow including member authentication, community subscription, post creation, and creating multiple comments with nested replies. Ensures that comments are correctly retrieved with their content, author information, vote scores, reply counts, and parent-comment relationships.
 *
 * Special attention is given to verifying that top-level comments have null parentComment, replies correctly reference their parent comment, vote scores are properly calculated, and reply counts reflect only immediate child comments.
 *
 * 1. Authenticate as a member with email, password, and username.
 * 2. Subscribe member to a community to enable post creation.
 * 3. Create a post in the subscribed community.
 * 4. Create multiple top-level comments on the post.
 * 5. Create reply comments to test threading (replies to existing comments).
 * 6. Retrieve the comment list for the post.
 * 7. Validate comment structure, parent relationships, vote scores, and reply counts.
 */
export async function test_api_comment_list_with_threaded_replies(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  // 2. Subscribe to a community
  const communityId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await generate_random_reddit_clone_member_subscriptions_create(
    memberConnection,
    {
      body: {
        community_id: communityId,
      },
    },
  );
  // 3. Create a post
  const post: IRedditClonePost =
    await generate_random_reddit_clone_member_posts_create(memberConnection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        post_type: "text",
        community_id: communityId,
        text_content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditClonePost.ICreate,
    });
  typia.assert(post);
  // 4. Create first top-level comment
  const topLevelComment1: IRedditCloneComment =
    await generate_random_reddit_clone_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 4 }),
        },
      },
    );
  typia.assert(topLevelComment1);
  // 5. Create second top-level comment
  const topLevelComment2: IRedditCloneComment =
    await generate_random_reddit_clone_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(topLevelComment2);
  // 6. Create reply to first top-level comment
  const replyComment1: IRedditCloneComment =
    await generate_random_reddit_clone_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
          parentCommentId: topLevelComment1.id,
        },
      },
    );
  typia.assert(replyComment1);
  // 7. Create another reply to first top-level comment
  const replyComment2: IRedditCloneComment =
    await generate_random_reddit_clone_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
          parentCommentId: topLevelComment1.id,
        },
      },
    );
  typia.assert(replyComment2);
  // 8. Create reply to second top-level comment
  const replyComment3: IRedditCloneComment =
    await generate_random_reddit_clone_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
          parentCommentId: topLevelComment2.id,
        },
      },
    );
  typia.assert(replyComment3);
  // 9. Retrieve comment list for the post
  const commentsPage: IPageIRedditCloneComment.ISummary =
    await api.functional.redditClone.posts.comments.index(memberConnection, {
      postId: post.id,
      body: {
        sortOrder: "new",
        sortDirection: "desc",
        limit: 100,
      } satisfies IRedditCloneComment.IRequest,
    });
  typia.assert(commentsPage);
  // 10. Validate pagination metadata
  TestValidator.equals(
    "total comment count",
    commentsPage.pagination.records,
    5,
  );
  TestValidator.equals("current page", commentsPage.pagination.current, 1);
  TestValidator.equals(
    "limit matches request",
    commentsPage.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "pages calculated correctly",
    commentsPage.pagination.pages >= 1,
  );
  // 11. Validate comment count matches expected
  TestValidator.equals("comments array length", commentsPage.data.length, 5);
  // 12. Find top-level comments in the response
  const topLevelComments = commentsPage.data.filter(
    (comment) => comment.parentComment === null,
  );
  const replyComments = commentsPage.data.filter(
    (comment) => comment.parentComment !== null,
  );
  // 13. Validate top-level comment count
  TestValidator.equals("top-level comments count", topLevelComments.length, 2);
  // 14. Validate reply comment count
  TestValidator.equals("reply comments count", replyComments.length, 3);
  // 15. Validate top-level comments have null parentComment
  topLevelComments.forEach((comment) => {
    TestValidator.equals(
      `top-level comment ${comment.id} has null parentComment`,
      comment.parentComment,
      null,
    );
  });
  // 16. Validate reply comments have non-null parentComment
  replyComments.forEach((comment) => {
    TestValidator.predicate(
      `reply comment ${comment.id} has parentComment`,
      comment.parentComment !== null,
    );
  });
  // 17. Validate reply comments reference correct parent
  const repliesToFirst = replyComments.filter(
    (comment) => comment.parentComment?.id === topLevelComment1.id,
  );
  const repliesToSecond = replyComments.filter(
    (comment) => comment.parentComment?.id === topLevelComment2.id,
  );
  TestValidator.equals(
    "replies to first top-level comment",
    repliesToFirst.length,
    2,
  );
  TestValidator.equals(
    "replies to second top-level comment",
    repliesToSecond.length,
    1,
  );
  // 18. Validate reply counts on top-level comments
  const topLevelComment1InResponse = commentsPage.data.find(
    (comment) => comment.id === topLevelComment1.id,
  );
  const topLevelComment2InResponse = commentsPage.data.find(
    (comment) => comment.id === topLevelComment2.id,
  );
  if (topLevelComment1InResponse) {
    TestValidator.equals(
      "first top-level comment reply count",
      topLevelComment1InResponse.reply_count,
      2,
    );
  }
  if (topLevelComment2InResponse) {
    TestValidator.equals(
      "second top-level comment reply count",
      topLevelComment2InResponse.reply_count,
      1,
    );
  }
  // 19. Validate vote scores are present (may be 0 if no votes)
  commentsPage.data.forEach((comment) => {
    TestValidator.predicate(
      `comment ${comment.id} has valid vote_score`,
      typeof comment.vote_score === "number",
    );
  });
  // 20. Validate all comments have required fields
  commentsPage.data.forEach((comment) => {
    TestValidator.predicate(
      `comment ${comment.id} has content`,
      comment.content.length > 0,
    );
    TestValidator.predicate(
      `comment ${comment.id} has author`,
      comment.author !== undefined,
    );
    TestValidator.predicate(
      `comment ${comment.id} has post reference`,
      comment.post !== undefined,
    );
    TestValidator.equals(
      `comment ${comment.id} belongs to correct post`,
      comment.post.id,
      post.id,
    );
  });
}
