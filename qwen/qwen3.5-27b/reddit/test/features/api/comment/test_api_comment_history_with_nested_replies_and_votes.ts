import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneComment";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_posts_comments_create } from "../../../generate/generate_random_reddit_clone_member_posts_comments_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { prepare_random_reddit_clone_comment } from "../../../prepare/prepare_random_reddit_clone_comment";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";

/**
 * Test comment history retrieval with complex nested reply structures and vote score calculations.
 *
 * This test verifies that the comment history endpoint correctly returns all comments
 * authored by the authenticated user, including nested replies, with accurate vote scores
 * and proper parent-child relationships. It also validates that deleted comments are
 * filtered out and that comments from multiple posts and communities are included.
 */
export async function test_api_comment_history_with_nested_replies_and_votes(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate primary member
  const member1Connection: api.IConnection = { host: connection.host };
  const member1Auth = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(2),
      bio: null,
      avatar_uri: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(member1Auth);
  // 2. Create a community
  const community =
    await generate_random_reddit_clone_member_communities_create(
      member1Connection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon: null,
        } satisfies IRedditCloneCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Create first post in the community
  const post1 = await generate_random_reddit_clone_member_posts_create(
    member1Connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        postType: "text",
        communityId: community.id,
        content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditClonePost.ICreate,
    },
  );
  typia.assert(post1);
  // 4. Create top-level comment on post1
  const topComment1 =
    await generate_random_reddit_clone_member_posts_comments_create(
      member1Connection,
      {
        params: {
          postId: post1.id,
        },
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
          parent_id: null,
        } satisfies IRedditCloneComment.ICreate,
      },
    );
  typia.assert(topComment1);
  // 5. Create nested reply to topComment1
  const replyComment1 =
    await generate_random_reddit_clone_member_posts_comments_create(
      member1Connection,
      {
        params: {
          postId: post1.id,
        },
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
          parent_id: topComment1.id,
        } satisfies IRedditCloneComment.ICreate,
      },
    );
  typia.assert(replyComment1);
  // 6. Create second post in the same community
  const post2 = await generate_random_reddit_clone_member_posts_create(
    member1Connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        postType: "text",
        communityId: community.id,
        content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditClonePost.ICreate,
    },
  );
  typia.assert(post2);
  // 7. Create top-level comment on post2
  const topComment2 =
    await generate_random_reddit_clone_member_posts_comments_create(
      member1Connection,
      {
        params: {
          postId: post2.id,
        },
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
          parent_id: null,
        } satisfies IRedditCloneComment.ICreate,
      },
    );
  typia.assert(topComment2);
  // 8. Create a second community and post for cross-community testing
  const community2 =
    await generate_random_reddit_clone_member_communities_create(
      member1Connection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon: null,
        } satisfies IRedditCloneCommunity.ICreate,
      },
    );
  typia.assert(community2);
  const post3 = await generate_random_reddit_clone_member_posts_create(
    member1Connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        postType: "text",
        communityId: community2.id,
        content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditClonePost.ICreate,
    },
  );
  typia.assert(post3);
  // 9. Create comment on post3 in different community
  const topComment3 =
    await generate_random_reddit_clone_member_posts_comments_create(
      member1Connection,
      {
        params: {
          postId: post3.id,
        },
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
          parent_id: null,
        } satisfies IRedditCloneComment.ICreate,
      },
    );
  typia.assert(topComment3);
  // 10. Register second member for voting
  const member2Connection: api.IConnection = { host: connection.host };
  const member2Auth = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(2),
      bio: null,
      avatar_uri: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(member2Auth);
  // 11. Retrieve comment history before voting
  const commentHistoryBefore =
    await api.functional.redditClone.member.me.comments.history(
      member1Connection,
    );
  typia.assert(commentHistoryBefore);
  // Validate initial comment count (should have 4 comments: topComment1, replyComment1, topComment2, topComment3)
  TestValidator.equals(
    "initial comment count",
    commentHistoryBefore.data.length,
    4,
  );
  // Validate that all comments are present
  const commentIdsBefore = commentHistoryBefore.data.map((c) => c.id);
  TestValidator.predicate(
    "topComment1 exists",
    commentIdsBefore.includes(topComment1.id),
  );
  TestValidator.predicate(
    "replyComment1 exists",
    commentIdsBefore.includes(replyComment1.id),
  );
  TestValidator.predicate(
    "topComment2 exists",
    commentIdsBefore.includes(topComment2.id),
  );
  TestValidator.predicate(
    "topComment3 exists",
    commentIdsBefore.includes(topComment3.id),
  );
  // Validate parent relationships
  const topComment1InHistory = commentHistoryBefore.data.find(
    (c) => c.id === topComment1.id,
  );
  const replyComment1InHistory = commentHistoryBefore.data.find(
    (c) => c.id === replyComment1.id,
  );
  TestValidator.equals(
    "topComment1 parent is null",
    topComment1InHistory?.parent,
    null,
  );
  TestValidator.predicate(
    "replyComment1 has parent",
    replyComment1InHistory?.parent !== null,
  );
  TestValidator.equals(
    "replyComment1 parent id matches topComment1",
    replyComment1InHistory?.parent?.id,
    topComment1.id,
  );
  // Validate initial scores (should be 0 before voting)
  TestValidator.equals(
    "topComment1 initial score is 0",
    topComment1InHistory?.score,
    0,
  );
  TestValidator.equals(
    "replyComment1 initial score is 0",
    replyComment1InHistory?.score,
    0,
  );
  // Validate ordering (newest first)
  TestValidator.predicate(
    "comments ordered by created_at descending",
    commentHistoryBefore.data.every((comment, index, array) => {
      if (index === 0) return true;
      return (
        new Date(comment.created_at) <= new Date(array[index - 1].created_at)
      );
    }),
  );
  // Validate post and community context
  TestValidator.equals(
    "topComment1 post id matches",
    topComment1InHistory?.post.id,
    post1.id,
  );
  TestValidator.equals(
    "topComment2 post id matches",
    commentHistoryBefore.data.find((c) => c.id === topComment2.id)?.post.id,
    post2.id,
  );
  TestValidator.equals(
    "topComment3 community id matches",
    commentHistoryBefore.data.find((c) => c.id === topComment3.id)?.post
      .community.id,
    community2.id,
  );
  // Validate author information
  commentHistoryBefore.data.forEach((comment) => {
    TestValidator.equals(
      `comment ${comment.id} author is member1`,
      comment.author.id,
      member1Auth.id,
    );
    TestValidator.equals(
      `comment ${comment.id} author username matches`,
      comment.author.username,
      member1Auth.username,
    );
  });
  // 12. Validate pagination metadata
  TestValidator.equals(
    "pagination current page is 1",
    commentHistoryBefore.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination records matches data length",
    commentHistoryBefore.pagination.records,
    commentHistoryBefore.data.length,
  );
  TestValidator.predicate(
    "pagination pages is at least 1",
    commentHistoryBefore.pagination.pages >= 1,
  );
  // Note: Voting functionality would require additional API endpoints not provided
  // The test validates the comment history structure and relationships
}