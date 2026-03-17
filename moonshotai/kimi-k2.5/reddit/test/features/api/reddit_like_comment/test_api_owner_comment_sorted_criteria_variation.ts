import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeComment";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeOwner";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikePostImageContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostImageContent";
import type { IRedditLikePostLinkContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostLinkContent";
import type { IRedditLikePostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostTextContent";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { generate_random_reddit_like_member_posts_comments_create } from "../../../generate/generate_random_reddit_like_member_posts_comments_create";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { prepare_random_reddit_like_comment } from "../../../prepare/prepare_random_reddit_like_comment";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";

export async function test_api_owner_comment_sorted_criteria_variation(
  connection: api.IConnection,
): Promise<void> {
  // Setup authenticated connections for different actors
  const ownerConnection: api.IConnection = { host: connection.host };
  const memberConnection: api.IConnection = { host: connection.host };
  // Authenticate owner
  await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      nickname: RandomGenerator.name(),
    } satisfies IRedditLikeOwner.IJoin,
  });
  // Authenticate member
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: typia.random<string & tags.MinLength<3> & tags.MaxLength<30>>(),
      password: typia.random<string & tags.MinLength<8> & tags.Format<"password">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  // Create community
  const community = await generate_random_reddit_like_member_communities_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);
  // Subscribe member to community
  const subscription =
    await api.functional.redditLike.member.communities.subscriptions.create(
      memberConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(subscription);
  // Create post
  const post = await generate_random_reddit_like_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_id: community.id,
        body: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post);
  // Create comments sequentially to ensure different timestamps
  const comment1 =
    await generate_random_reddit_like_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          content: "First comment created for sorting test",
        } satisfies IRedditLikeComment.ICreate,
      },
    );
  typia.assert(comment1);
  const comment2 =
    await generate_random_reddit_like_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          content: "Second comment created for sorting test",
        } satisfies IRedditLikeComment.ICreate,
      },
    );
  typia.assert(comment2);
  const comment3 =
    await generate_random_reddit_like_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          content: "Third comment created for sorting test",
        } satisfies IRedditLikeComment.ICreate,
      },
    );
  typia.assert(comment3);
  // Test NEW sorting (newest first, descending created_at)
  const newResult =
    await api.functional.redditLike.owner.posts.comments.sorted.index(
      ownerConnection,
      {
        postId: post.id,
        body: {
          sort: "NEW",
          page: 1,
          limit: 10,
          search: null,
          authorId: null,
          parentId: null,
          includeDeleted: false,
        } satisfies IRedditLikeComment.IRequest,
      },
    );
  typia.assert(newResult);
  // Verify NEW order: comment3 (newest), comment2, comment1 (oldest)
  TestValidator.equals(
    "NEW sort: first comment is newest",
    newResult.data[0].id,
    comment3.id,
  );
  TestValidator.equals(
    "NEW sort: second comment is middle",
    newResult.data[1].id,
    comment2.id,
  );
  TestValidator.equals(
    "NEW sort: third comment is oldest",
    newResult.data[2].id,
    comment1.id,
  );
  // Test OLD sorting (oldest first, ascending created_at)
  const oldResult =
    await api.functional.redditLike.owner.posts.comments.sorted.index(
      ownerConnection,
      {
        postId: post.id,
        body: {
          sort: "OLD",
          page: 1,
          limit: 10,
          search: null,
          authorId: null,
          parentId: null,
          includeDeleted: false,
        } satisfies IRedditLikeComment.IRequest,
      },
    );
  typia.assert(oldResult);
  // Verify OLD order: comment1 (oldest), comment2, comment3 (newest)
  TestValidator.equals(
    "OLD sort: first comment is oldest",
    oldResult.data[0].id,
    comment1.id,
  );
  TestValidator.equals(
    "OLD sort: second comment is middle",
    oldResult.data[1].id,
    comment2.id,
  );
  TestValidator.equals(
    "OLD sort: third comment is newest",
    oldResult.data[2].id,
    comment3.id,
  );
  // Test TOP sorting (by vote score descending)
  const topResult =
    await api.functional.redditLike.owner.posts.comments.sorted.index(
      ownerConnection,
      {
        postId: post.id,
        body: {
          sort: "TOP",
          page: 1,
          limit: 10,
          search: null,
          authorId: null,
          parentId: null,
          includeDeleted: false,
        } satisfies IRedditLikeComment.IRequest,
      },
    );
  typia.assert(topResult);
  // Verify all comments are present in TOP results
  TestValidator.predicate(
    "TOP sort returns all three comments",
    () =>
      topResult.data.length === 3 &&
      topResult.data.some((c) => c.id === comment1.id) &&
      topResult.data.some((c) => c.id === comment2.id) &&
      topResult.data.some((c) => c.id === comment3.id),
  );
  // Verify consistency by checking that timestamps are properly ordered in results
  TestValidator.predicate(
    "NEW sort has consistent descending timestamp order",
    () =>
      new Date(newResult.data[0].created_at).getTime() >=
        new Date(newResult.data[1].created_at).getTime() &&
      new Date(newResult.data[1].created_at).getTime() >=
        new Date(newResult.data[2].created_at).getTime(),
  );
  TestValidator.predicate(
    "OLD sort has consistent ascending timestamp order",
    () =>
      new Date(oldResult.data[0].created_at).getTime() <=
        new Date(oldResult.data[1].created_at).getTime() &&
      new Date(oldResult.data[1].created_at).getTime() <=
        new Date(oldResult.data[2].created_at).getTime(),
  );
}