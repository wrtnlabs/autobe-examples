import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityCommunity";
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

export async function test_api_community_list_search_by_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a member account
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create 3 communities with distinct names
  const techDiscussion =
    await generate_random_community_member_communities_create(
      memberConnection,
      {
        body: {
          name: "TechDiscussion",
          description: "A community for tech discussion",
        },
      },
    );
  typia.assert(techDiscussion);
  const techNews = await generate_random_community_member_communities_create(
    memberConnection,
    {
      body: {
        name: "TechNews",
        description: "A community for tech news",
      },
    },
  );
  typia.assert(techNews);
  const cookingRecipes =
    await generate_random_community_member_communities_create(
      memberConnection,
      {
        body: {
          name: "CookingRecipes",
          description: "A community for cooking recipes",
        },
      },
    );
  typia.assert(cookingRecipes);
  // 3. Search with lowercase 'tech' - should match TechDiscussion and TechNews
  const searchConnection: api.IConnection = { host: connection.host };
  const lowercaseResult = await api.functional.community.communities.index(
    searchConnection,
    {
      body: {
        name: "tech",
      } satisfies ICommunityCommunity.IRequest,
    },
  );
  typia.assert(lowercaseResult);
  // Verify TechDiscussion is in results (by ID)
  TestValidator.predicate(
    "TechDiscussion community is in lowercase 'tech' search results",
    lowercaseResult.data.some((c) => c.id === techDiscussion.id),
  );
  // Verify TechNews is in results (by ID)
  TestValidator.predicate(
    "TechNews community is in lowercase 'tech' search results",
    lowercaseResult.data.some((c) => c.id === techNews.id),
  );
  // Verify CookingRecipes is NOT in results (by ID)
  TestValidator.predicate(
    "CookingRecipes community is NOT in lowercase 'tech' search results",
    !lowercaseResult.data.some((c) => c.id === cookingRecipes.id),
  );
  // Verify pagination.records is at least 2
  TestValidator.predicate(
    "lowercase 'tech' search pagination records >= 2",
    lowercaseResult.pagination.records >= 2,
  );
  // 4. Search with uppercase 'TECH' - should return same results (case-insensitive)
  const uppercaseResult = await api.functional.community.communities.index(
    searchConnection,
    {
      body: {
        name: "TECH",
      } satisfies ICommunityCommunity.IRequest,
    },
  );
  typia.assert(uppercaseResult);
  // Verify TechDiscussion is in uppercase results (case-insensitive match)
  TestValidator.predicate(
    "TechDiscussion community is in uppercase 'TECH' search results",
    uppercaseResult.data.some((c) => c.id === techDiscussion.id),
  );
  // Verify TechNews is in uppercase results (case-insensitive match)
  TestValidator.predicate(
    "TechNews community is in uppercase 'TECH' search results",
    uppercaseResult.data.some((c) => c.id === techNews.id),
  );
  // Verify CookingRecipes is NOT in uppercase TECH results
  TestValidator.predicate(
    "CookingRecipes community is NOT in uppercase 'TECH' search results",
    !uppercaseResult.data.some((c) => c.id === cookingRecipes.id),
  );
  // Verify same record count as lowercase search (case-insensitive parity)
  TestValidator.equals(
    "uppercase TECH search returns same record count as lowercase tech",
    uppercaseResult.pagination.records,
    lowercaseResult.pagination.records,
  );
  // 5. Search with non-matching term - should return empty result
  const noMatchResult = await api.functional.community.communities.index(
    searchConnection,
    {
      body: {
        name: "xyznonexistentcommunity12345",
      } satisfies ICommunityCommunity.IRequest,
    },
  );
  typia.assert(noMatchResult);
  // Verify empty data array
  TestValidator.equals(
    "non-matching search returns empty data array",
    noMatchResult.data.length,
    0,
  );
  // Verify pagination.records equals 0
  TestValidator.equals(
    "non-matching search returns 0 records",
    noMatchResult.pagination.records,
    0,
  );
  // Verify pagination.pages equals 0
  TestValidator.equals(
    "non-matching search returns 0 pages",
    noMatchResult.pagination.pages,
    0,
  );
}
