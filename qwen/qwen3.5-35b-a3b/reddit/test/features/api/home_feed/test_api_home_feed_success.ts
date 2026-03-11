import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberSession";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostFeedRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostFeedRequest";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { generate_random_reddit_platform_member_subscriptions_subscribe } from "../../../generate/generate_random_reddit_platform_member_subscriptions_subscribe";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_subscription } from "../../../prepare/prepare_random_reddit_platform_community_subscription";

export async function test_api_home_feed_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authenticated member
  const authConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(authConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(10),
      password: RandomGenerator.alphaNumeric(12),
      displayName: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Create community
  const communityConnection: api.IConnection = { host: connection.host };
  const community =
    await generate_random_reddit_platform_member_communities_create(
      communityConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(8),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Subscribe member to community
  const subscribeConnection: api.IConnection = { host: connection.host };
  const subscription =
    await generate_random_reddit_platform_member_subscriptions_subscribe(
      subscribeConnection,
      {
        body: {
          reddit_platform_community_id: community.id,
        } satisfies IRedditPlatformCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 4. Call home feed endpoint
  const feedConnection: api.IConnection = { host: connection.host };
  const feed = await api.functional.redditPlatform.member.posts.feed.home.index(
    feedConnection,
    {
      body: {} satisfies IRedditPlatformPostFeedRequest,
    },
  );
  typia.assert(feed);
  // 5. Validate response structure
  TestValidator.predicate("feed response is valid", feed !== null);
  TestValidator.predicate("feed has pagination", feed.pagination !== null);
  // 6. Validate pagination metadata values
  const { pagination } = feed;
  TestValidator.predicate("current page is positive", pagination.current >= 1);
  TestValidator.predicate("page limit is positive", pagination.limit >= 1);
  TestValidator.predicate(
    "total records is non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate("total pages is non-negative", pagination.pages >= 0);
  TestValidator.predicate(
    "pages calculated correctly",
    pagination.pages === Math.ceil(pagination.records / pagination.limit) ||
      (pagination.records === 0 && pagination.pages === 0),
  );
  // 7. Validate posts array structure
  const { data: posts } = feed;
  TestValidator.predicate("posts is array", Array.isArray(posts));
  // 8. If posts exist, validate each post has required fields
  if (posts.length > 0) {
    await ArrayUtil.asyncForEach(posts, async (post) => {
      typia.assert(post);
      // Validate post has all required summary fields
      TestValidator.predicate("post has id", post.id !== undefined);
      TestValidator.predicate("post has title", post.title !== undefined);
      TestValidator.predicate(
        "post has post_type",
        post.post_type !== undefined,
      );
      TestValidator.predicate(
        "post has vote_score",
        post.vote_score !== undefined,
      );
      TestValidator.predicate(
        "post has comment_count",
        post.comment_count !== undefined,
      );
      TestValidator.predicate("post has author", post.author !== undefined);
      TestValidator.predicate(
        "post has community",
        post.community !== undefined,
      );
      TestValidator.predicate(
        "post has created_at",
        post.created_at !== undefined,
      );
      // Validate author has required fields
      TestValidator.predicate("author has id", post.author.id !== undefined);
      TestValidator.predicate(
        "author has username",
        post.author.username !== undefined,
      );
      TestValidator.predicate(
        "author has display_name",
        post.author.display_name !== undefined,
      );
      TestValidator.predicate(
        "author has karma_score",
        post.author.karma_score !== undefined,
      );
      TestValidator.predicate(
        "author has is_active",
        post.author.is_active !== undefined,
      );
      TestValidator.predicate(
        "author has created_at",
        post.author.created_at !== undefined,
      );
      // Validate community has required fields
      TestValidator.predicate(
        "community has id",
        post.community.id !== undefined,
      );
      TestValidator.predicate(
        "community has name",
        post.community.name !== undefined,
      );
      TestValidator.predicate(
        "community has subscriber_count",
        post.community.subscriber_count !== undefined,
      );
      TestValidator.predicate(
        "community has created_at",
        post.community.created_at !== undefined,
      );
    });
    // 9. Validate pagination consistency
    TestValidator.predicate(
      "pagination records match actual posts count",
      pagination.records >= posts.length,
    );
  }
}
