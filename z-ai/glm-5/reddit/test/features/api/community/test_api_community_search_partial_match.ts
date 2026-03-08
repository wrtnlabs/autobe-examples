import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
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
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

export async function test_api_community_search_partial_match(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create multiple communities with known names for search testing
  const community1 =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: "TechnologyTalk",
          description: "A community for discussing technology trends",
        },
      },
    );
  typia.assert(community1);
  const community2 =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: "GamingZone",
          description: "All about video games and gaming culture",
        },
      },
    );
  typia.assert(community2);
  const community3 =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: "TechSupport",
          description: "Get help with your technical issues",
        },
      },
    );
  typia.assert(community3);
  // 3. Search with partial term 'tech' - should match 'TechnologyTalk' and 'TechSupport'
  const searchTechResult =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        search: "tech",
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(searchTechResult);
  TestValidator.predicate(
    "search 'tech' returns TechnologyTalk",
    searchTechResult.data.some((c) => c.name === "TechnologyTalk"),
  );
  TestValidator.predicate(
    "search 'tech' returns TechSupport",
    searchTechResult.data.some((c) => c.name === "TechSupport"),
  );
  TestValidator.predicate(
    "search 'tech' does not return GamingZone",
    !searchTechResult.data.some((c) => c.name === "GamingZone"),
  );
  // 4. Test case-insensitive search with different variations
  const searchUppercase =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        search: "TECH",
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(searchUppercase);
  const searchMixedCase =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        search: "tEcH",
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(searchMixedCase);
  // Verify same results for different case variations
  TestValidator.equals(
    "case-insensitive search returns same results",
    searchTechResult.data.map((c) => c.id).sort(),
    searchUppercase.data.map((c) => c.id).sort(),
  );
  TestValidator.equals(
    "mixed case search returns same results",
    searchTechResult.data.map((c) => c.id).sort(),
    searchMixedCase.data.map((c) => c.id).sort(),
  );
  // 5. Search with term that matches no communities
  const noMatchResult =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        search: "nonexistentkeyword12345",
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(noMatchResult);
  TestValidator.equals(
    "no match returns empty data array",
    noMatchResult.data.length,
    0,
  );
  TestValidator.equals(
    "no match returns zero records",
    noMatchResult.pagination.records,
    0,
  );
  // 6. Verify search results include all required display fields
  if (searchTechResult.data.length > 0) {
    const firstResult = searchTechResult.data[0];
    TestValidator.predicate(
      "result has name field",
      typeof firstResult.name === "string",
    );
    TestValidator.predicate(
      "result has description field",
      typeof firstResult.description === "string",
    );
    TestValidator.predicate(
      "result has subscriber_count field",
      typeof firstResult.subscriber_count === "number",
    );
    TestValidator.predicate(
      "result has icon field (null or URL)",
      firstResult.icon === null || typeof firstResult.icon === "string",
    );
  }
  // 7. Verify search only filters by name, not by description
  // Search for "gaming" which appears in GamingZone name
  const searchGamingName =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        search: "Gaming",
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(searchGamingName);
  TestValidator.predicate(
    "search 'Gaming' returns GamingZone",
    searchGamingName.data.some((c) => c.name === "GamingZone"),
  );
  // Search for "games" which appears in GamingZone's description but NOT in name
  const searchGamesDesc =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        search: "games",
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(searchGamesDesc);
  // Since search only filters by name, GamingZone should NOT be returned for "games"
  // (the word "games" is in the description but not in the name "GamingZone")
  TestValidator.predicate(
    "search 'games' does not match GamingZone by description",
    !searchGamesDesc.data.some((c) => c.name === "GamingZone"),
  );
}
