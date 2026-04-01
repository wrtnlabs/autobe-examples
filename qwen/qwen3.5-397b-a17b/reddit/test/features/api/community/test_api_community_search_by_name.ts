import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityIcon";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";

/**
 * Test community search functionality including partial name matching and edge case where no communities match the search term.
 *
 * **Test Steps:**
 * 1. Create member account to own communities
 * 2. Create multiple communities with distinct names (Technology, TechNews, Gaming, Music)
 * 3. Search for communities using partial name match (e.g., 'Tech' should match 'Technology' and 'TechNews')
 * 4. Search for communities using a term that matches no existing communities
 * 5. Verify search is case-insensitive
 *
 * **Validation Points:**
 * - Partial match search returns all communities whose names contain the search term (ILIKE operator)
 * - Search term 'Tech' matches both 'Technology' and 'TechNews'
 * - Search with non-matching term returns empty data array (not an error)
 * - Empty results include valid pagination metadata (records: 0, pages: 0, current: 1, limit: as requested)
 * - Search is case-insensitive (searching 'tech' matches 'Technology')
 * - Response maintains correct schema structure even with empty results
 * - Subscriber counts and owner information are included in search results
 */
export async function test_api_community_search_by_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  // 2. Create multiple communities with distinct names
  const technologyCommunity =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {
        body: {
          name: "Technology",
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(technologyCommunity);
  const techNewsCommunity =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {
        body: {
          name: "TechNews",
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(techNewsCommunity);
  const gamingCommunity =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {
        body: {
          name: "Gaming",
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(gamingCommunity);
  const musicCommunity =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {
        body: {
          name: "Music",
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(musicCommunity);
  // 3. Search for communities using partial name match 'Tech'
  const techSearchResult =
    await api.functional.redditCommunity.communities.index(memberConnection, {
      body: {
        search: "Tech",
        page: 1,
        limit: 10,
      } satisfies IRedditCommunityCommunity.IRequest,
    });
  typia.assert(techSearchResult);
  // Validate partial match returns Technology and TechNews
  TestValidator.equals(
    "search returns 2 communities for 'Tech'",
    techSearchResult.data.length,
    2,
  );
  TestValidator.predicate(
    "search includes Technology",
    techSearchResult.data.some((c) => c.name === "Technology"),
  );
  TestValidator.predicate(
    "search includes TechNews",
    techSearchResult.data.some((c) => c.name === "TechNews"),
  );
  TestValidator.equals(
    "pagination records match",
    techSearchResult.pagination.records,
    2,
  );
  TestValidator.equals(
    "pagination pages correct",
    techSearchResult.pagination.pages,
    1,
  );
  // 4. Search for communities with non-matching term
  const noMatchSearchResult =
    await api.functional.redditCommunity.communities.index(memberConnection, {
      body: {
        search: "NonExistentCommunity",
        page: 1,
        limit: 10,
      } satisfies IRedditCommunityCommunity.IRequest,
    });
  typia.assert(noMatchSearchResult);
  // Validate empty results
  TestValidator.equals(
    "no match returns empty array",
    noMatchSearchResult.data.length,
    0,
  );
  TestValidator.equals(
    "empty results have 0 records",
    noMatchSearchResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty results have 0 pages",
    noMatchSearchResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty results current page is 1",
    noMatchSearchResult.pagination.current,
    1,
  );
  // 5. Verify search is case-insensitive
  const lowercaseTechResult =
    await api.functional.redditCommunity.communities.index(memberConnection, {
      body: {
        search: "tech",
        page: 1,
        limit: 10,
      } satisfies IRedditCommunityCommunity.IRequest,
    });
  typia.assert(lowercaseTechResult);
  // Validate case-insensitive search returns same results
  TestValidator.equals(
    "case-insensitive search returns 2 communities",
    lowercaseTechResult.data.length,
    2,
  );
  TestValidator.predicate(
    "lowercase search includes Technology",
    lowercaseTechResult.data.some((c) => c.name === "Technology"),
  );
  TestValidator.predicate(
    "lowercase search includes TechNews",
    lowercaseTechResult.data.some((c) => c.name === "TechNews"),
  );
  // 6. Validate search results include required fields
  const firstCommunity = techSearchResult.data[0];
  TestValidator.predicate("community has id", firstCommunity.id !== undefined);
  TestValidator.predicate(
    "community has name",
    firstCommunity.name !== undefined,
  );
  TestValidator.predicate(
    "community has description",
    firstCommunity.description !== undefined,
  );
  TestValidator.predicate(
    "community has owner",
    firstCommunity.owner !== undefined,
  );
  TestValidator.predicate(
    "community has subscriber_count",
    firstCommunity.subscriber_count !== undefined,
  );
  TestValidator.predicate(
    "community has created_at",
    firstCommunity.created_at !== undefined,
  );
}
