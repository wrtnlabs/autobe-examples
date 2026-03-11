import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformCommunitySubscription";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberSession";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
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

export async function test_api_member_subscriptions_search_sort(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration
  const memberConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(10),
      password: RandomGenerator.alphaNumeric(12),
      displayName: RandomGenerator.name(1),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarUrl: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(joinResponse);
  // 2. Create multiple distinct communities
  const techNews =
    await generate_random_reddit_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: "technews",
          description: "Latest technology news",
          icon_url: "https://example.com/technews-icon.png",
        },
      },
    );
  typia.assert(techNews);
  const gaming =
    await generate_random_reddit_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: "gaming",
          description: "Gaming community",
          icon_url: "https://example.com/gaming-icon.png",
        },
      },
    );
  typia.assert(gaming);
  const cooking =
    await generate_random_reddit_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: "cooking",
          description: "Cooking and recipes",
          icon_url: "https://example.com/cooking-icon.png",
        },
      },
    );
  typia.assert(cooking);
  const photography =
    await generate_random_reddit_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: "photography",
          description: "Photography tips and tricks",
          icon_url: "https://example.com/photography-icon.png",
        },
      },
    );
  typia.assert(photography);
  const science =
    await generate_random_reddit_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: "science",
          description: "Science and research",
          icon_url: "https://example.com/science-icon.png",
        },
      },
    );
  typia.assert(science);
  // 3. Subscribe to communities
  await api.functional.redditPlatform.member.subscriptions.subscribe(
    memberConnection,
    {
      body: { reddit_platform_community_id: techNews.id },
    },
  );
  await api.functional.redditPlatform.member.subscriptions.subscribe(
    memberConnection,
    {
      body: { reddit_platform_community_id: gaming.id },
    },
  );
  await api.functional.redditPlatform.member.subscriptions.subscribe(
    memberConnection,
    {
      body: { reddit_platform_community_id: cooking.id },
    },
  );
  await api.functional.redditPlatform.member.subscriptions.subscribe(
    memberConnection,
    {
      body: { reddit_platform_community_id: photography.id },
    },
  );
  await api.functional.redditPlatform.member.subscriptions.subscribe(
    memberConnection,
    {
      body: { reddit_platform_community_id: science.id },
    },
  );
  // 4. Call PATCH /redditPlatform/member/subscriptions with search, sort, and pagination
  const sortedSubscriptions =
    await api.functional.redditPlatform.member.subscriptions.index(
      memberConnection,
      {
        body: {
          serviceName: "tech", // partial match search
          sortBy: "state",
          sortOrder: "desc",
          page: 1,
          limit: 10,
        } satisfies IRedditPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(sortedSubscriptions);
  // 5. Validate pagination metadata
  TestValidator.equals(
    "response has pagination metadata",
    sortedSubscriptions.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches requested",
    sortedSubscriptions.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    sortedSubscriptions.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    sortedSubscriptions.pagination.pages >= 0,
  );
  // Verify each result includes required fields
  for (const subscription of sortedSubscriptions.data) {
    typia.assert(subscription);
    TestValidator.notEquals("subscription has id", subscription.id, "");
    TestValidator.predicate(
      "subscription has service name",
      subscription.serviceName.length > 0,
    );
    TestValidator.predicate(
      "subscription has valid state",
      ["open", "half-open", "closed"].includes(subscription.state),
    );
    TestValidator.predicate(
      "subscription has non-negative failure count",
      subscription.failureCount >= 0,
    );
    TestValidator.predicate(
      "subscription has non-negative success count",
      subscription.successCount >= 0,
    );
  }
  // Test with no search filter - should return all subscriptions
  const allSubscriptions =
    await api.functional.redditPlatform.member.subscriptions.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IRedditPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(allSubscriptions);
  TestValidator.equals(
    "all subscriptions count is at least 5",
    allSubscriptions.data.length >= 5,
    true,
  );
}
