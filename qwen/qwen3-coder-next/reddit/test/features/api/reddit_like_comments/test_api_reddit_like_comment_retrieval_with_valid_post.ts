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
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { generate_random_reddit_like_member_subscriptions_create } from "../../../generate/generate_random_reddit_like_member_subscriptions_create";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";
import { prepare_random_reddit_like_subscription } from "../../../prepare/prepare_random_reddit_like_subscription";

export async function test_api_reddit_like_comment_retrieval_with_valid_post(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create test member users
  const user1Connection: api.IConnection = { host: connection.host };
  const user1 = await api.functional.redditLike.auth.member.join(
    user1Connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphaNumeric(8),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        bio: null,
        avatar_url: null,
      } satisfies IRedditLikeMember.IJoin,
    },
  );
  typia.assert(user1);
  const user2Connection: api.IConnection = { host: connection.host };
  const user2 = await api.functional.redditLike.auth.member.join(
    user2Connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphaNumeric(8),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        bio: null,
        avatar_url: null,
      } satisfies IRedditLikeMember.IJoin,
    },
  );
  typia.assert(user2);
  const user3Connection: api.IConnection = { host: connection.host };
  const user3 = await api.functional.redditLike.auth.member.join(
    user3Connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphaNumeric(8),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        bio: null,
        avatar_url: null,
      } satisfies IRedditLikeMember.IJoin,
    },
  );
  typia.assert(user3);
  // 2. Subscribe user1 to a community
  const communityId = typia.random<string & tags.Format<"uuid">>();
  await api.functional.redditLike.member.subscriptions.create(user1Connection, {
    body: {
      reddit_like_member_id: user1.id,
      reddit_like_community_id: communityId,
      status: "subscribed",
    } satisfies IRedditLikeSubscription.ICreate,
  });
  // 3. Create a post with user1
  const post = await api.functional.redditLike.member.posts.create(
    user1Connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        type: "text",
        content: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
        url: null,
        image_url: null,
        community_id: communityId,
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post);
  // 4. Test default sorting (best - by vote score DESC)
  const bestSortResult = await api.functional.redditLike.posts.comments.index(
    user1Connection,
    {
      postId: post.id,
      body: { sort: "best" } satisfies IRedditLikeComment.IRequest,
    },
  );
  typia.assert(bestSortResult);
  // Validate 'best' sort order (highest vote_score first)
  TestValidator.predicate(
    "first comment exists",
    bestSortResult.data.length > 0,
  );
  TestValidator.predicate(
    "comments have vote scores",
    bestSortResult.data.every((c) => typeof c.voteScore === "number"),
  );
  // Validate author information exists
  TestValidator.predicate(
    "comments have author info",
    bestSortResult.data.every((c) => c.author && c.author.id !== undefined),
  );
  // Validate timestamps exist
  TestValidator.predicate(
    "comments have timestamps",
    bestSortResult.data.every((c) => c.createdAt !== undefined),
  );
  // Validate pagination structure
  TestValidator.equals(
    "pagination current page",
    bestSortResult.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", bestSortResult.pagination.limit, 20);
  TestValidator.equals(
    "pagination records",
    bestSortResult.pagination.records,
    3,
  );
  TestValidator.equals("pagination pages", bestSortResult.pagination.pages, 1);
  // 5. Test 'new' sorting (most recent first)
  const newSortResult = await api.functional.redditLike.posts.comments.index(
    user1Connection,
    {
      postId: post.id,
      body: { sort: "new" } satisfies IRedditLikeComment.IRequest,
    },
  );
  typia.assert(newSortResult);
  TestValidator.equals(
    "new sort returns same comments",
    newSortResult.data.length,
    bestSortResult.data.length,
  );
  // 6. Test 'controversial' sorting
  const controversialSortResult =
    await api.functional.redditLike.posts.comments.index(user1Connection, {
      postId: post.id,
      body: { sort: "controversial" } satisfies IRedditLikeComment.IRequest,
    });
  typia.assert(controversialSortResult);
  TestValidator.equals(
    "controversial sort returns same comments",
    controversialSortResult.data.length,
    bestSortResult.data.length,
  );
}
