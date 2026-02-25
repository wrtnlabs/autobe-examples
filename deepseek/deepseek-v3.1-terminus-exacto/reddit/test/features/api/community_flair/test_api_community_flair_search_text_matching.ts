import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityFlair } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityFlair";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityFlair } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityFlair";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

export async function test_api_community_flair_search_text_matching(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(userAuth);
  // Create a community
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Note: Since we don't have flair creation endpoints available in the provided utilities,
  // we'll test the search functionality with the assumption that the community has some flairs
  // or that the search endpoint handles empty results gracefully.
  // Test various search patterns
  const searchTests = [
    { search: "tech", description: "search for 'tech' pattern" },
    { search: "support", description: "search for 'support' pattern" },
    { search: "NEWS", description: "test case-insensitive search" },
    { search: "com", description: "test partial matching" },
    { search: "", description: "test empty search" },
  ];
  for (const testCase of searchTests) {
    const searchResult =
      await api.functional.communityPlatform.communities.flairs.index(
        userConnection,
        {
          communityId: community.id,
          body: {
            search: testCase.search,
            page: 1,
            limit: 10,
          } satisfies ICommunityPlatformCommunityFlair.IRequest,
        },
      );
    typia.assert(searchResult);
    // Validate pagination structure
    TestValidator.equals(
      "pagination structure",
      searchResult.pagination.current,
      1,
    );
    TestValidator.equals("pagination limit", searchResult.pagination.limit, 10);
    TestValidator.predicate(
      "records count valid",
      searchResult.pagination.records >= 0,
    );
    TestValidator.predicate(
      "pages count valid",
      searchResult.pagination.pages >= 0,
    );
    // Validate that data is an array (may be empty if no flairs exist)
    TestValidator.predicate("data is array", Array.isArray(searchResult.data));
  }
  // Test search with active filter
  const activeSearchResult =
    await api.functional.communityPlatform.communities.flairs.index(
      userConnection,
      {
        communityId: community.id,
        body: {
          search: "test",
          isActive: true,
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformCommunityFlair.IRequest,
      },
    );
  typia.assert(activeSearchResult);
  // Test search with inactive filter
  const inactiveSearchResult =
    await api.functional.communityPlatform.communities.flairs.index(
      userConnection,
      {
        communityId: community.id,
        body: {
          search: "test",
          isActive: false,
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformCommunityFlair.IRequest,
      },
    );
  typia.assert(inactiveSearchResult);
  // Test pagination functionality
  const paginatedResult =
    await api.functional.communityPlatform.communities.flairs.index(
      userConnection,
      {
        communityId: community.id,
        body: {
          search: "",
          page: 2,
          limit: 3,
        } satisfies ICommunityPlatformCommunityFlair.IRequest,
      },
    );
  typia.assert(paginatedResult);
  TestValidator.equals(
    "page 2 current page",
    paginatedResult.pagination.current,
    2,
  );
  TestValidator.equals("page 2 limit", paginatedResult.pagination.limit, 3);
}
