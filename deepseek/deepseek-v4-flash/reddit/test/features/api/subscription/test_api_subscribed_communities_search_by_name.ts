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

/**
 * Test searching subscribed communities by partial name match.
 *
 * Validates that the subscribed communities listing endpoint correctly filters by community name using case-insensitive partial matching. Ensures that authenticated members can search their subscriptions, pagination metadata is accurate, and various search scenarios (match found, empty string, no match) return appropriate results.
 *
 * 1. Register a member and create three communities with distinct names: 'ProgrammingDaily', 'PhotographyWorld', 'CookingRecipes'. Subscribe to all three.
 * 2. Search with 'Prog' — expects only 'ProgrammingDaily' (1 record).
 * 3. Search with '' — expects all 3 communities returned.
 * 4. Search with 'NonExistent123' — expects empty page (0 records).
 */
export async function test_api_subscribed_communities_search_by_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create three communities with distinct names
  const community1 =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: "ProgrammingDaily",
        },
      },
    );
  typia.assert(community1);
  const community2 =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: "PhotographyWorld",
        },
      },
    );
  typia.assert(community2);
  const community3 =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: "CookingRecipes",
        },
      },
    );
  typia.assert(community3);
  // 3. Subscribe to all three communities
  await generate_random_community_platform_member_communities_subscribers_create(
    memberConnection,
    {
      params: { communityId: community1.id },
    },
  );
  await generate_random_community_platform_member_communities_subscribers_create(
    memberConnection,
    {
      params: { communityId: community2.id },
    },
  );
  await generate_random_community_platform_member_communities_subscribers_create(
    memberConnection,
    {
      params: { communityId: community3.id },
    },
  );
  // 4. Test 1: Search with 'Prog' — should find only ProgrammingDaily
  const searchProg =
    await api.functional.communityPlatform.member.subscriptions.communities.index(
      memberConnection,
      {
        body: {
          search: "Prog",
          page: 1,
          limit: 10,
          sort: "name",
          direction: "asc",
        } satisfies ICommunityPlatformSubscription.IRequest,
      },
    );
  typia.assert(searchProg);
  TestValidator.equals("records for 'Prog'", searchProg.pagination.records, 1);
  TestValidator.equals("pages for 'Prog'", searchProg.pagination.pages, 1);
  TestValidator.equals("data length for 'Prog'", searchProg.data.length, 1);
  TestValidator.equals(
    "community name for 'Prog'",
    searchProg.data[0]!.name,
    "ProgrammingDaily",
  );
  // 5. Test 2: Search with '' (empty) — should return all 3 communities
  const searchEmpty =
    await api.functional.communityPlatform.member.subscriptions.communities.index(
      memberConnection,
      {
        body: {
          search: "",
          page: 1,
          limit: 10,
          sort: "name",
          direction: "asc",
        } satisfies ICommunityPlatformSubscription.IRequest,
      },
    );
  typia.assert(searchEmpty);
  TestValidator.equals(
    "records for empty search",
    searchEmpty.pagination.records,
    3,
  );
  TestValidator.equals(
    "data length for empty search",
    searchEmpty.data.length,
    3,
  );
  // 6. Test 3: Search with 'NonExistent123' — should return empty page
  const searchNone =
    await api.functional.communityPlatform.member.subscriptions.communities.index(
      memberConnection,
      {
        body: {
          search: "NonExistent123",
          page: 1,
          limit: 10,
          sort: "name",
          direction: "asc",
        } satisfies ICommunityPlatformSubscription.IRequest,
      },
    );
  typia.assert(searchNone);
  TestValidator.equals(
    "records for nonexistent search",
    searchNone.pagination.records,
    0,
  );
  TestValidator.equals(
    "pages for nonexistent search",
    searchNone.pagination.pages,
    0,
  );
  TestValidator.equals(
    "data length for nonexistent search",
    searchNone.data.length,
    0,
  );
}
