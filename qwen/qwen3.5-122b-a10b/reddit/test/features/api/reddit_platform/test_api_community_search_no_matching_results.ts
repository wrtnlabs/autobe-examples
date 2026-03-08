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

export async function test_api_community_search_no_matching_results(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member account for authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email"> & tags.MinLength<1> & tags.MaxLength<255>>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Create first community with known name
  const community1 =
    await generate_random_reddit_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: "TestCommunityOne" + RandomGenerator.alphabets(5),
          description: "Test community for search testing",
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community1);
  // 3. Create second community with known name
  const community2 =
    await generate_random_reddit_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: "TestCommunityTwo" + RandomGenerator.alphabets(5),
          description: "Another test community",
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community2);
  // 4. Search with a unique term that does not match any community
  const uniqueSearchTerm =
    "NonExistentCommunity" + RandomGenerator.alphabets(10);
  const searchResult =
    await api.functional.redditPlatform.communities.search.index(
      memberConnection,
      {
        body: {
          search: uniqueSearchTerm,
          page: 1,
          limit: 20,
        } satisfies IRedditPlatformCommunity.IRequest,
      },
    );
  typia.assert(searchResult);
  // 5. Verify empty results with correct pagination metadata
  TestValidator.equals("data array is empty", searchResult.data.length, 0);
  TestValidator.equals(
    "pagination records is zero",
    searchResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages is zero",
    searchResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "pagination current page is 1",
    searchResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 20",
    searchResult.pagination.limit,
    20,
  );
  // 6. Test case-insensitive matching with existing community names
  // Search with different case variations of community1 name
  const caseVariations = [
    community1.name.toUpperCase(),
    community1.name.toLowerCase(),
    community1.name.charAt(0).toUpperCase() +
      community1.name.slice(1).toLowerCase(),
  ];
  for (const variation of caseVariations) {
    const caseSearchResult =
      await api.functional.redditPlatform.communities.search.index(
        memberConnection,
        {
          body: {
            search: variation,
            page: 1,
            limit: 20,
          } satisfies IRedditPlatformCommunity.IRequest,
        },
      );
    typia.assert(caseSearchResult);
    TestValidator.predicate(
      `case variation "${variation}" returns community1`,
      caseSearchResult.data.some((c) => c.id === community1.id),
    );
  }
}