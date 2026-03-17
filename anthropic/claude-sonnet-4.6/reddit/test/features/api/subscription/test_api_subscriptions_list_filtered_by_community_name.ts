import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_communities_create } from "../../../generate/generate_random_community_member_communities_create";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";

export async function test_api_subscriptions_list_filtered_by_community_name(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new member and obtain session
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // Step 2: Create three communities with distinct names
  // 'AlphaTest Community' and 'BetaTest Community' contain 'Test'
  // 'Gamma Community' does NOT contain 'Test'
  const communityAlpha =
    await generate_random_community_member_communities_create(
      memberConnection,
      {
        body: {
          name: "AlphaTest Community",
          description: "Alpha test community",
        },
      },
    );
  typia.assert(communityAlpha);
  const communityBeta =
    await generate_random_community_member_communities_create(
      memberConnection,
      {
        body: {
          name: "BetaTest Community",
          description: "Beta test community",
        },
      },
    );
  typia.assert(communityBeta);
  const communityGamma =
    await generate_random_community_member_communities_create(
      memberConnection,
      {
        body: {
          name: "Gamma Community",
          description: "Gamma community without test keyword",
        },
      },
    );
  typia.assert(communityGamma);
  // Step 3: Subscribe member to each community
  const subAlpha =
    await api.functional.community.member.communities.subscriptions.create(
      memberConnection,
      { communityId: communityAlpha.id },
    );
  typia.assert(subAlpha);
  const subBeta =
    await api.functional.community.member.communities.subscriptions.create(
      memberConnection,
      { communityId: communityBeta.id },
    );
  typia.assert(subBeta);
  const subGamma =
    await api.functional.community.member.communities.subscriptions.create(
      memberConnection,
      { communityId: communityGamma.id },
    );
  typia.assert(subGamma);
  // Test 1: Filtered search by 'Test' keyword, sorted by community_name asc
  const filteredResult =
    await api.functional.community.member.subscriptions.index(
      memberConnection,
      {
        body: {
          search: "Test",
          sortBy: "community_name",
          sortOrder: "asc",
          page: 1,
          limit: 10,
        } satisfies ICommunitySubscription.IRequest,
      },
    );
  typia.assert(filteredResult);
  // Assert pagination.records equals 2 (only 'AlphaTest' and 'BetaTest' match)
  TestValidator.equals(
    "filtered records count",
    filteredResult.pagination.records,
    2,
  );
  // Assert data contains exactly 2 items
  TestValidator.equals("filtered data length", filteredResult.data.length, 2);
  // Assert none of the items is 'Gamma Community'
  TestValidator.predicate(
    "gamma community not in filtered results",
    filteredResult.data.every(
      (item) => !item.community.name.toLowerCase().includes("gamma"),
    ),
  );
  // Assert all items contain 'test' (case-insensitive)
  TestValidator.predicate(
    "all filtered items contain 'Test' keyword",
    filteredResult.data.every((item) =>
      item.community.name.toLowerCase().includes("test"),
    ),
  );
  // Assert sorted alphabetically: 'AlphaTest Community' first, 'BetaTest Community' second
  TestValidator.equals(
    "first filtered item is AlphaTest Community",
    filteredResult.data[0]!.community.name,
    "AlphaTest Community",
  );
  TestValidator.equals(
    "second filtered item is BetaTest Community",
    filteredResult.data[1]!.community.name,
    "BetaTest Community",
  );
  // Test 2: Pagination boundary test (no filter, limit=1)
  const paginatedResult =
    await api.functional.community.member.subscriptions.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 1,
          sortBy: "community_name",
          sortOrder: "asc",
        } satisfies ICommunitySubscription.IRequest,
      },
    );
  typia.assert(paginatedResult);
  // Assert data contains exactly 1 item
  TestValidator.equals("paginated data length", paginatedResult.data.length, 1);
  // Assert pagination.records equals 3 (total subscriptions)
  TestValidator.equals("total records", paginatedResult.pagination.records, 3);
  // Assert pagination.pages equals 3 (since limit=1 and 3 records)
  TestValidator.equals("total pages", paginatedResult.pagination.pages, 3);
  // Assert pagination.current equals 1
  TestValidator.equals("current page", paginatedResult.pagination.current, 1);
  // Assert the single returned item is alphabetically first: 'AlphaTest Community'
  TestValidator.equals(
    "paginated first item is AlphaTest Community",
    paginatedResult.data[0]!.community.name,
    "AlphaTest Community",
  );
}
