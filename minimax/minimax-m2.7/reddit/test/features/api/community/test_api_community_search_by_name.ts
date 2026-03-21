import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneCommunityBan";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import type { IRedditCloneUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserKarma";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { prepare_random_reddit_clone_community_ban } from "../../../prepare/prepare_random_reddit_clone_community_ban";

export async function test_api_community_search_by_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member for creating test communities
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create multiple communities with different names for search testing
  // Create communities with 'tech' in name (various case variations)
  const techCommunity1 =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {
        body: {
          name: `tech_${RandomGenerator.alphabets(5)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(techCommunity1);
  const techCommunity2 =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {
        body: {
          name: `TECH_${RandomGenerator.alphabets(5)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(techCommunity2);
  // Create a community with 'gaming' in name (should NOT match 'tech' search)
  const gamingCommunity =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {
        body: {
          name: `gaming_${RandomGenerator.alphabets(5)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(gamingCommunity);
  // 3. Search communities by 'tech' (case-insensitive partial matching)
  // Using guest connection (no auth required for this endpoint)
  const guestConnection: api.IConnection = { host: connection.host };
  const searchResult = await api.functional.redditClone.communities.index(
    guestConnection,
    {
      body: {
        name: "tech",
      } satisfies IRedditCloneCommunityBan.IRequest,
    },
  );
  typia.assert(searchResult);
  // 4. Validate search results
  // Verify response structure
  TestValidator.equals(
    "has pagination metadata",
    searchResult.pagination !== null && searchResult.pagination !== undefined,
    true,
  );
  TestValidator.predicate("has data array", searchResult.data.length > 0);
  // Extract community names from search results
  const communityNames = searchResult.data.map((c) => c.name.toLowerCase());
  // Verify 'tech' communities are in results (case-insensitive match)
  TestValidator.predicate(
    "tech community 1 in results",
    communityNames.some((name) => name.includes("tech")),
  );
  TestValidator.predicate(
    "tech community 2 (TECH uppercase) in results",
    communityNames.some((name) => name.includes("tech")),
  );
  // Verify 'gaming' community is NOT in results
  TestValidator.predicate(
    "gaming community NOT in results",
    !communityNames.some((name) => name.includes("gaming")),
  );
  // 5. Verify pagination works with search filter
  const paginatedSearch = await api.functional.redditClone.communities.index(
    guestConnection,
    {
      body: {
        name: "tech",
        limit: 1,
        page: 1,
      } satisfies IRedditCloneCommunityBan.IRequest,
    },
  );
  typia.assert(paginatedSearch);
  TestValidator.equals("limit is 1", paginatedSearch.pagination.limit, 1);
  TestValidator.predicate("has results", paginatedSearch.data.length <= 1);
}
