import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityImage";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunity";
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

export async function test_api_subscribed_communities_list_with_multiple_subscriptions(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create Community A
  const communityA =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: `community-${RandomGenerator.alphabets(8)}`,
        },
      },
    );
  typia.assert(communityA);
  // 3. Subscribe the member to Community A
  await generate_random_community_platform_member_communities_subscribers_create(
    memberConnection,
    {
      params: { communityId: communityA.id },
    },
  );
  // 4. Create Community B
  const communityB =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: `community-${RandomGenerator.alphabets(8)}`,
        },
      },
    );
  typia.assert(communityB);
  // 5. Subscribe the member to Community B
  await generate_random_community_platform_member_communities_subscribers_create(
    memberConnection,
    {
      params: { communityId: communityB.id },
    },
  );
  // 6. Retrieve the member's subscribed communities list
  const result: IPageICommunityPlatformCommunity.ISummary =
    await api.functional.communityPlatform.member.subscriptions.index(
      memberConnection,
      {
        body: {},
      },
    );
  typia.assert(result);
  // 7. Verify pagination metadata structure
  TestValidator.equals("pagination current", result.pagination.current, 1);
  TestValidator.predicate("pagination limit > 0", result.pagination.limit > 0);
  TestValidator.equals("pagination records", result.pagination.records, 2);
  TestValidator.equals("pagination pages", result.pagination.pages, 1);
  // 8. Verify both subscribed communities are returned
  TestValidator.equals("subscribed communities count", result.data.length, 2);
  // 9. Verify each community has the expected subscriber count
  for (const community of result.data) {
    TestValidator.predicate(
      `subscriber_count for ${community.name} >= 1`,
      community.subscriber_count >= 1,
    );
  }
}
