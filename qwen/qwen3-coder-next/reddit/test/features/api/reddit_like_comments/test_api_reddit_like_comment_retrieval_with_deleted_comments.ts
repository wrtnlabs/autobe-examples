import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeComment";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikeSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeSubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_posts_comments_create } from "../../../generate/generate_random_reddit_like_member_posts_comments_create";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { generate_random_reddit_like_member_subscriptions_create } from "../../../generate/generate_random_reddit_like_member_subscriptions_create";
import { prepare_random_reddit_like_comment } from "../../../prepare/prepare_random_reddit_like_comment";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";
import { prepare_random_reddit_like_subscription } from "../../../prepare/prepare_random_reddit_like_subscription";

export async function test_api_reddit_like_comment_retrieval_with_deleted_comments(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create two test members
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await api.functional.redditLike.auth.member.join(
    member1Connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(8),
        password: RandomGenerator.alphabets(12),
        display_name: RandomGenerator.name(),
        bio: null,
        avatar_url: null,
      } satisfies IRedditLikeMember.IJoin,
    },
  );
  typia.assert(member1);
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await api.functional.redditLike.auth.member.join(
    member2Connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(8),
        password: RandomGenerator.alphabets(12),
        display_name: RandomGenerator.name(),
        bio: null,
        avatar_url: null,
      } satisfies IRedditLikeMember.IJoin,
    },
  );
  typia.assert(member2);
  // Create a community (using member1's ID for subscription)
  const community = await api.functional.redditLike.member.subscriptions.create(
    member1Connection,
    {
      body: {
        reddit_like_member_id: member1.id,
        reddit_like_community_id: typia.random<string & tags.Format<"uuid">>(),
        status: "subscribed",
      } satisfies IRedditLikeSubscription.ICreate,
    },
  );
  typia.assert(community);
  // 3. Create post
  const post = await api.functional.redditLike.member.posts.create(
    member1Connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        type: "text" as const,
        content: RandomGenerator.content({ paragraphs: 3 }),
        community_id: community.id,
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post);
  // 4. Create three comments
  const comment1 = await api.functional.redditLike.member.posts.comments.create(
    member1Connection,
    {
      postId: post.id,
      body: {
        content: "First comment content",
      } satisfies IRedditLikeComment.ICreate,
    },
  );
  typia.assert(comment1);
  const comment2 = await api.functional.redditLike.member.posts.comments.create(
    member1Connection,
    {
      postId: post.id,
      body: {
        content: "Second comment content",
      } satisfies IRedditLikeComment.ICreate,
    },
  );
  typia.assert(comment2);
  const comment3 = await api.functional.redditLike.member.posts.comments.create(
    member1Connection,
    {
      postId: post.id,
      body: {
        content: "Third comment content",
      } satisfies IRedditLikeComment.ICreate,
    },
  );
  typia.assert(comment3);
  // 5. Delete one comment (comment2) to test soft-delete filtering
  await api.functional.redditLike.member.comments.erase(member1Connection, {
    commentId: comment2.id,
  });
  // 6. Retrieve comments and verify deleted comment is excluded
  const response = await api.functional.redditLike.posts.comments.index(
    member1Connection,
    {
      postId: post.id,
      body: {
        sort: "best",
      } satisfies IRedditLikeComment.IRequest,
    },
  );
  typia.assert(response);
  // Verify pagination structure
  TestValidator.predicate(
    "pagination current is valid",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records matches count",
    response.pagination.records >= 2,
  );
  // Verify soft-deleted comment is excluded
  const activeCommentIds = response.data.map((c) => c.id);
  TestValidator.predicate(
    "deleted comment excluded",
    activeCommentIds.includes(comment2.id) === false,
  );
  // Verify active comments are included
  TestValidator.predicate(
    "first comment included",
    activeCommentIds.includes(comment1.id),
  );
  TestValidator.predicate(
    "third comment included",
    activeCommentIds.includes(comment3.id),
  );
  // Verify each returned comment has required structure
  response.data.forEach((comment) => {
    TestValidator.predicate(
      "comment has valid id",
      typeof comment.id === "string",
    );
    TestValidator.predicate(
      "comment has content",
      typeof comment.content === "string",
    );
    TestValidator.predicate(
      "comment has valid author",
      comment.author !== null && comment.author !== undefined,
    );
  });
}
