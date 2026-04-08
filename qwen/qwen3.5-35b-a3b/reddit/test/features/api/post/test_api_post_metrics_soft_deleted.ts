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
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { generate_random_reddit_platform_member_subscriptions_create } from "../../../generate/generate_random_reddit_platform_member_subscriptions_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_subscription } from "../../../prepare/prepare_random_reddit_platform_subscription";

export async function test_api_post_metrics_soft_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePass123",
      username:
        RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  memberConnection.headers = { Authorization: memberAuth.token.access };
  // 2. Create community
  const community =
    await api.functional.redditPlatform.member.communities.create(
      memberConnection,
      {
        body: {
          name:
            RandomGenerator.alphaNumeric(6) +
            "_" +
            RandomGenerator.alphaNumeric(4),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Subscribe to community
  const subscription =
    await api.functional.redditPlatform.member.subscriptions.create(
      memberConnection,
      {
        body: {
          community_id: community.id,
        } satisfies IRedditPlatformSubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 4. Create post
  const post = await api.functional.redditPlatform.member.posts.create(
    memberConnection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text",
        text_content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Get initial metrics
  const initialMetrics =
    await api.functional.redditPlatform.member.posts.metrics.at(
      memberConnection,
      {
        postId: post.id,
      },
    );
  typia.assert(initialMetrics);
  // 6. Soft-delete the post
  await api.functional.redditPlatform.member.posts.erase(memberConnection, {
    postId: post.id,
  });
  // 7. Verify metrics after deletion
  const deletedMetrics =
    await api.functional.redditPlatform.member.posts.metrics.at(
      memberConnection,
      {
        postId: post.id,
      },
    );
  typia.assert(deletedMetrics);
  // 8. Validate metrics fields
  TestValidator.equals("post id matches", deletedMetrics.id, post.id);
  TestValidator.equals(
    "upvotes preserved",
    deletedMetrics.upvotes_count,
    initialMetrics.upvotes_count,
  );
  TestValidator.equals(
    "downvotes preserved",
    deletedMetrics.downvotes_count,
    initialMetrics.downvotes_count,
  );
  TestValidator.equals(
    "score preserved",
    deletedMetrics.score,
    initialMetrics.score,
  );
  TestValidator.equals(
    "comment count preserved",
    deletedMetrics.comment_count,
    initialMetrics.comment_count,
  );
  TestValidator.equals(
    "created_at unchanged",
    deletedMetrics.created_at,
    initialMetrics.created_at,
  );
  TestValidator.notEquals(
    "updated_at changed",
    initialMetrics.updated_at,
    deletedMetrics.updated_at,
  );
  TestValidator.notEquals("deleted_at is set", deletedMetrics.deleted_at, null);
  TestValidator.equals("isDeleted is true", deletedMetrics.isDeleted, true);
}
