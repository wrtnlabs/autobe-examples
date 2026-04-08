import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostImage";
import type { IRedditPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostLink";
import type { IRedditPlatformPostMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostMetric";
import type { IRedditPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostText";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import type { IRedditPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformSubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_comments_create } from "../../../generate/generate_random_reddit_platform_member_comments_create";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { generate_random_reddit_platform_member_posts_vote } from "../../../generate/generate_random_reddit_platform_member_posts_vote";
import { generate_random_reddit_platform_member_subscriptions_create } from "../../../generate/generate_random_reddit_platform_member_subscriptions_create";
import { prepare_random_reddit_platform_comment } from "../../../prepare/prepare_random_reddit_platform_comment";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_post_vote } from "../../../prepare/prepare_random_reddit_platform_post_vote";
import { prepare_random_reddit_platform_subscription } from "../../../prepare/prepare_random_reddit_platform_subscription";

export async function test_api_post_metrics_retrieval(
  connection: api.IConnection,
) {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username:
        RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>() ?? "",
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Create community
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(adminConnection, {
    body: {
      email: authorized.email,
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IRedditPlatformMember.ILogin,
  });
  const community =
    await api.functional.redditPlatform.member.communities.create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(12) + "_community",
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Subscribe to community
  await generate_random_reddit_platform_member_subscriptions_create(
    memberConnection,
    {
      body: { community_id: community.id },
    },
  );
  // 4. Create post
  const post = await api.functional.redditPlatform.member.posts.create(
    memberConnection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        post_type: "text",
        text_content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Cast votes on post
  await generate_random_reddit_platform_member_posts_vote(memberConnection, {
    body: { vote_type: "up" },
    params: { postId: post.id },
  });
  await generate_random_reddit_platform_member_posts_vote(memberConnection, {
    body: { vote_type: "up" },
    params: { postId: post.id },
  });
  await generate_random_reddit_platform_member_posts_vote(memberConnection, {
    body: { vote_type: "down" },
    params: { postId: post.id },
  });
  // 6. Create comments on post
  await generate_random_reddit_platform_member_comments_create(
    memberConnection,
    {
      body: {
        reddit_platform_post_id: post.id,
        content: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IRedditPlatformComment.ICreate,
    },
  );
  await generate_random_reddit_platform_member_comments_create(
    memberConnection,
    {
      body: {
        reddit_platform_post_id: post.id,
        content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditPlatformComment.ICreate,
    },
  );
  await generate_random_reddit_platform_member_comments_create(
    memberConnection,
    {
      body: {
        reddit_platform_post_id: post.id,
        content: RandomGenerator.paragraph({ sentences: 4 }),
      } satisfies IRedditPlatformComment.ICreate,
    },
  );
  // 7. Retrieve metrics
  const metrics = await api.functional.redditPlatform.member.posts.metrics.at(
    memberConnection,
    {
      postId: post.id,
    },
  );
  typia.assert(metrics);
  // 8. Validate response
  TestValidator.equals("metrics id matches post id", metrics.id, post.id);
  TestValidator.equals("upvotes_count is 2", metrics.upvotes_count, 2);
  TestValidator.equals("downvotes_count is 1", metrics.downvotes_count, 1);
  TestValidator.equals("score is 1 (2-1)", metrics.score, 1);
  TestValidator.equals("comment_count is 3", metrics.comment_count, 3);
  TestValidator.equals(
    "created_at matches post creation",
    metrics.created_at,
    post.created_at,
  );
  TestValidator.equals(
    "updated_at matches post update",
    metrics.updated_at,
    post.updated_at,
  );
  TestValidator.equals(
    "deleted_at is null for active post",
    metrics.deleted_at,
    null,
  );
  TestValidator.equals(
    "isDeleted is false for active post",
    metrics.isDeleted,
    false,
  );
}