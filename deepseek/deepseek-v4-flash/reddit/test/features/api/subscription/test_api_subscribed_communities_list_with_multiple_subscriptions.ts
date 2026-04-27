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
  // =====================================================
  // 1. Register a new member
  // =====================================================
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // =====================================================
  // 2. Create first community "TechTalk"
  // =====================================================
  const techTalk =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: { name: "TechTalk" },
      },
    );
  typia.assert(techTalk);
  // =====================================================
  // 3. Subscribe to first community
  // =====================================================
  const sub1 =
    await generate_random_community_platform_member_communities_subscribers_create(
      memberConnection,
      {
        params: { communityId: techTalk.id },
      },
    );
  typia.assert(sub1);
  // =====================================================
  // 4. Create second community "ArtGallery"
  // =====================================================
  const artGallery =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: { name: "ArtGallery" },
      },
    );
  typia.assert(artGallery);
  // =====================================================
  // 5. Subscribe to second community
  // =====================================================
  const sub2 =
    await generate_random_community_platform_member_communities_subscribers_create(
      memberConnection,
      {
        params: { communityId: artGallery.id },
      },
    );
  typia.assert(sub2);
  // =====================================================
  // 6. Fetch subscribed communities list sorted by name
  // =====================================================
  const page =
    await api.functional.communityPlatform.member.subscriptions.communities.index(
      memberConnection,
      {
        body: {
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
          sort: "name" as string,
          direction: "asc" as string,
        } satisfies ICommunityPlatformSubscription.IRequest,
      },
    );
  typia.assert(page);
  // =====================================================
  // 7. Validate pagination metadata
  // =====================================================
  TestValidator.equals("current page", page.pagination.current, 1);
  TestValidator.equals("records count", page.pagination.records, 2);
  TestValidator.equals("pages count", page.pagination.pages, 1);
  // =====================================================
  // 8. Validate data array and alphabetical sorting
  // =====================================================
  TestValidator.equals("data length", page.data.length, 2);
  TestValidator.equals(
    "first community name (alphabetical)",
    page.data[0].name,
    "ArtGallery",
  );
  TestValidator.equals(
    "second community name (alphabetical)",
    page.data[1].name,
    "TechTalk",
  );
  // =====================================================
  // 9. Validate each community summary structure
  // =====================================================
  for (const community of page.data) {
    typia.assert(community);
    TestValidator.predicate(
      "subscriber count >= 1",
      community.subscriber_count >= 1,
    );
  }
}
