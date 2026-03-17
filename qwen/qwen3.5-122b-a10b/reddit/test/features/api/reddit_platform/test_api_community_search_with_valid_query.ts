import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformCommunity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFile";
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
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";

export async function test_api_community_search_with_valid_query(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account for authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Create 3 communities with distinct names
  const community1 =
    await generate_random_reddit_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: "Technology",
          description: "A community for technology enthusiasts",
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community1);
  const community2 =
    await generate_random_reddit_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: "Gaming",
          description: "A community for gamers",
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community2);
  const community3 =
    await generate_random_reddit_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: "Sports",
          description: "A community for sports fans",
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community3);
  // 3. Search with query "tech" - should match "Technology" (case-insensitive)
  const techSearch =
    await api.functional.redditPlatform.communities.search.index(
      memberConnection,
      {
        body: {
          search: "tech",
          page: 1,
          limit: 20,
        } satisfies IRedditPlatformCommunity.IRequest,
      },
    );
  typia.assert(techSearch);
  TestValidator.equals(
    "tech search returns 1 result",
    techSearch.data.length,
    1,
  );
  TestValidator.equals(
    "tech search matches Technology",
    techSearch.data[0].name,
    "Technology",
  );
  TestValidator.predicate(
    "tech search has pagination",
    techSearch.pagination.current === 1,
  );
  // 4. Search with uppercase query to verify case-insensitivity
  const upperCaseSearch =
    await api.functional.redditPlatform.communities.search.index(
      memberConnection,
      {
        body: {
          search: "TECH",
          page: 1,
          limit: 20,
        } satisfies IRedditPlatformCommunity.IRequest,
      },
    );
  typia.assert(upperCaseSearch);
  TestValidator.equals(
    "uppercase tech search returns 1 result",
    upperCaseSearch.data.length,
    1,
  );
  TestValidator.equals(
    "uppercase tech search matches Technology",
    upperCaseSearch.data[0].name,
    "Technology",
  );
  // 5. Search with query "ga" - should match "Gaming"
  const gamingSearch =
    await api.functional.redditPlatform.communities.search.index(
      memberConnection,
      {
        body: {
          search: "ga",
          page: 1,
          limit: 20,
        } satisfies IRedditPlatformCommunity.IRequest,
      },
    );
  typia.assert(gamingSearch);
  TestValidator.equals(
    "gaming search returns 1 result",
    gamingSearch.data.length,
    1,
  );
  TestValidator.equals(
    "gaming search matches Gaming",
    gamingSearch.data[0].name,
    "Gaming",
  );
  // 6. Search with empty query - should return all communities
  const allSearch =
    await api.functional.redditPlatform.communities.search.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IRedditPlatformCommunity.IRequest,
      },
    );
  typia.assert(allSearch);
  TestValidator.equals(
    "all search returns 3 results",
    allSearch.data.length,
    3,
  );
  TestValidator.equals(
    "all search pagination records",
    allSearch.pagination.records,
    3,
  );
  TestValidator.equals(
    "all search pagination pages",
    allSearch.pagination.pages,
    1,
  );
  // 7. Validate response structure for each community
  for (const community of allSearch.data) {
    typia.assert(community);
    TestValidator.predicate("community has id", community.id.length > 0);
    TestValidator.predicate("community has name", community.name.length > 0);
    TestValidator.predicate(
      "community has owner",
      community.owner.id.length > 0,
    );
    TestValidator.predicate(
      "community has owner username",
      community.owner.username.length > 0,
    );
    TestValidator.predicate(
      "community has subscriber count",
      community.subscriber_count >= 1,
    );
    TestValidator.predicate(
      "community has created_at",
      community.created_at.length > 0,
    );
  }
  // 8. Test sorting by name (ascending)
  const sortByName =
    await api.functional.redditPlatform.communities.search.index(
      memberConnection,
      {
        body: {
          sort: "name",
          order: "asc",
          page: 1,
          limit: 20,
        } satisfies IRedditPlatformCommunity.IRequest,
      },
    );
  typia.assert(sortByName);
  TestValidator.equals("name sort returns results", sortByName.data.length, 3);
  TestValidator.predicate(
    "name sort is ascending",
    sortByName.data[0].name <= sortByName.data[1].name &&
      sortByName.data[1].name <= sortByName.data[2].name,
  );
  // 9. Test sorting by name (descending)
  const sortByNameDesc =
    await api.functional.redditPlatform.communities.search.index(
      memberConnection,
      {
        body: {
          sort: "name",
          order: "desc",
          page: 1,
          limit: 20,
        } satisfies IRedditPlatformCommunity.IRequest,
      },
    );
  typia.assert(sortByNameDesc);
  TestValidator.equals(
    "name desc sort returns results",
    sortByNameDesc.data.length,
    3,
  );
  TestValidator.predicate(
    "name desc sort is descending",
    sortByNameDesc.data[0].name >= sortByNameDesc.data[1].name &&
      sortByNameDesc.data[1].name >= sortByNameDesc.data[2].name,
  );
  // 10. Test sorting by subscriber_count (descending)
  const sortBySubscribers =
    await api.functional.redditPlatform.communities.search.index(
      memberConnection,
      {
        body: {
          sort: "subscriber_count",
          order: "desc",
          page: 1,
          limit: 20,
        } satisfies IRedditPlatformCommunity.IRequest,
      },
    );
  typia.assert(sortBySubscribers);
  TestValidator.equals(
    "subscriber sort returns results",
    sortBySubscribers.data.length,
    3,
  );
  TestValidator.predicate(
    "subscriber count sort is descending",
    sortBySubscribers.data[0].subscriber_count >=
      sortBySubscribers.data[1].subscriber_count &&
      sortBySubscribers.data[1].subscriber_count >=
        sortBySubscribers.data[2].subscriber_count,
  );
}