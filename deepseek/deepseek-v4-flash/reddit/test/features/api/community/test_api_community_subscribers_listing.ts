import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityImage";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_communities_subscribers_create } from "../../../generate/generate_random_community_platform_member_communities_subscribers_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_image } from "../../../prepare/prepare_random_community_platform_community_image";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

export async function test_api_community_subscribers_listing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create owner member and their connection
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ownerConnection, {});
  // 2. Create a community
  const community =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // 3. Create 3 subscriber members and subscribe them to the community
  const SUBSCRIBER_COUNT = 3;
  for (let i = 0; i < SUBSCRIBER_COUNT; i++) {
    const subConnection: api.IConnection = { host: connection.host };
    await authorize_member_join(subConnection, {});
    await generate_random_community_platform_member_communities_subscribers_create(
      subConnection,
      {
        params: { communityId: community.id },
      },
    );
  }
  // 4. Default listing — no pagination/sort params
  const defaultResult: IPageICommunityPlatformCommunitySubscription.ISummary =
    await api.functional.communityPlatform.communities.subscribers.index(
      ownerConnection,
      {
        communityName: community.name,
        body: {} satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(defaultResult);
  TestValidator.equals(
    "default subscriber count",
    defaultResult.data.length,
    SUBSCRIBER_COUNT,
  );
  TestValidator.equals(
    "default pagination records",
    defaultResult.pagination.records,
    SUBSCRIBER_COUNT,
  );
  // 5. Test sort='desc' — newest subscriptions first
  const descResult: IPageICommunityPlatformCommunitySubscription.ISummary =
    await api.functional.communityPlatform.communities.subscribers.index(
      ownerConnection,
      {
        communityName: community.name,
        body: {
          sort: "desc",
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(descResult);
  TestValidator.equals(
    "desc subscriber count",
    descResult.data.length,
    SUBSCRIBER_COUNT,
  );
  for (let i = 1; i < descResult.data.length; i++) {
    const prev = new Date(descResult.data[i - 1].created_at).getTime();
    const curr = new Date(descResult.data[i].created_at).getTime();
    TestValidator.predicate(`desc ordering at index ${i}`, prev >= curr);
  }
  // 6. Test sort='asc' — oldest subscriptions first
  const ascResult: IPageICommunityPlatformCommunitySubscription.ISummary =
    await api.functional.communityPlatform.communities.subscribers.index(
      ownerConnection,
      {
        communityName: community.name,
        body: {
          sort: "asc",
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(ascResult);
  TestValidator.equals(
    "asc subscriber count",
    ascResult.data.length,
    SUBSCRIBER_COUNT,
  );
  for (let i = 1; i < ascResult.data.length; i++) {
    const prev = new Date(ascResult.data[i - 1].created_at).getTime();
    const curr = new Date(ascResult.data[i].created_at).getTime();
    TestValidator.predicate(`asc ordering at index ${i}`, prev <= curr);
  }
  // 7. Test pagination with page=1, limit=1
  const paginatedResult: IPageICommunityPlatformCommunitySubscription.ISummary =
    await api.functional.communityPlatform.communities.subscribers.index(
      ownerConnection,
      {
        communityName: community.name,
        body: {
          page: 1,
          limit: 1,
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(paginatedResult);
  TestValidator.equals("paginated data length", paginatedResult.data.length, 1);
  TestValidator.equals(
    "pagination current",
    paginatedResult.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", paginatedResult.pagination.limit, 1);
  TestValidator.equals(
    "pagination records",
    paginatedResult.pagination.records,
    SUBSCRIBER_COUNT,
  );
  TestValidator.equals(
    "pagination pages",
    paginatedResult.pagination.pages,
    SUBSCRIBER_COUNT,
  );
}
