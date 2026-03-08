import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformCommunity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { generate_random_reddit_platform_member_communities_subscribe } from "../../../generate/generate_random_reddit_platform_member_communities_subscribe";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_subscription } from "../../../prepare/prepare_random_reddit_platform_community_subscription";
import { prepare_random_reddit_platform_member } from "../../../prepare/prepare_random_reddit_platform_member";

export async function test_api_community_subscribed_list_view(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const authConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(authConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_]+$">
      >(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(authResult);
  // 2. Create test communities (at least 2 for subscription testing)
  const communityConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(communityConnection, {
    body: {
      email: authResult.email,
      password: "1234",
    } satisfies IRedditPlatformMember.ILogin,
  });
  const community1 =
    await generate_random_reddit_platform_member_communities_create(
      communityConnection,
      {
        body: {
          name: typia.random<string & tags.MinLength<3> & tags.MaxLength<20>>(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community1);
  const community2 =
    await generate_random_reddit_platform_member_communities_create(
      communityConnection,
      {
        body: {
          name: typia.random<string & tags.MinLength<3> & tags.MaxLength<20>>(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community2);
  // 3. Subscribe member to created communities
  const sub1 =
    await generate_random_reddit_platform_member_communities_subscribe(
      communityConnection,
      {
        body: {
          confirmSubscription: true,
        } satisfies IRedditPlatformCommunitySubscription.ICreate,
        params: {
          communityId: community1.id,
        },
      },
    );
  typia.assert(sub1);
  const sub2 =
    await generate_random_reddit_platform_member_communities_subscribe(
      communityConnection,
      {
        body: {
          confirmSubscription: true,
        } satisfies IRedditPlatformCommunitySubscription.ICreate,
        params: {
          communityId: community2.id,
        },
      },
    );
  typia.assert(sub2);
  // 4. Retrieve subscribed communities list with pagination and sorting
  const subscribedPage =
    await api.functional.redditPlatform.member.users.me.communities.subscribed.index(
      communityConnection,
      {
        body: {
          page: 1,
          limit: 20,
          sort: "newest",
        } satisfies IRedditPlatformCommunity.ISubscribedRequest,
      },
    );
  typia.assert(subscribedPage);
  // 5. Validate response structure
  TestValidator.equals(
    "has pagination",
    subscribedPage.pagination !== null,
    true,
  );
  TestValidator.equals(
    "has data array",
    Array.isArray(subscribedPage.data),
    true,
  );
  TestValidator.equals(
    "data is array of summaries",
    subscribedPage.data.every(
      (item) => typeof item === "object" && item !== null && "id" in item,
    ),
    true,
  );
  // 6. Validate pagination metadata
  TestValidator.equals(
    "current page is 1",
    subscribedPage.pagination.current,
    1,
  );
  TestValidator.equals("limit is 20", subscribedPage.pagination.limit, 20);
  TestValidator.equals(
    "records count is at least 2",
    subscribedPage.pagination.records,
    2,
  );
  TestValidator.equals(
    "pages count is at least 1",
    subscribedPage.pagination.pages,
    1,
  );
  // 7. Validate each community in response includes required fields
  for (const community of subscribedPage.data) {
    typia.assert(community);
    TestValidator.predicate("community has valid id", community.id.length > 0);
    TestValidator.predicate("community has name", community.name.length > 0);
    TestValidator.predicate(
      "community has subscriber_count",
      typeof community.subscriber_count === "number",
    );
    TestValidator.predicate("community has author", community.author !== null);
    TestValidator.predicate(
      "community has created_at",
      community.created_at.length > 0,
    );
    TestValidator.equals(
      "community has description (nullable OK)",
      community.description === null ||
        typeof community.description === "string",
      true,
    );
    TestValidator.equals(
      "community has icon_url (nullable OK)",
      community.icon_url === null || typeof community.icon_url === "string",
      true,
    );
  }
  // 8. Verify that subscribed communities are in the response (check by community IDs)
  const responseIds = subscribedPage.data.map((c) => c.id);
  TestValidator.equals(
    "community1 is in response",
    responseIds.includes(community1.id),
    true,
  );
  TestValidator.equals(
    "community2 is in response",
    responseIds.includes(community2.id),
    true,
  );
  // 9. Verify sorting is by subscribed_at (newest first)
  if (subscribedPage.data.length >= 2) {
    const firstSubscribedAt = sub1.subscribedAt;
    const secondSubscribedAt = sub2.subscribedAt;
    const isFirstNewer = firstSubscribedAt > secondSubscribedAt;
    TestValidator.predicate("communities sorted by newest first", () =>
      subscribedPage.data[0].id === community1.id
        ? isFirstNewer
        : subscribedPage.data[0].id === community2.id
          ? !isFirstNewer
          : true,
    );
  }
}
