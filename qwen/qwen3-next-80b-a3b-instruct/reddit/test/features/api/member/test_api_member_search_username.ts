import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformMember";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { generate_random_community_platform_member_communities_posts_create } from "../../../generate/generate_random_community_platform_member_communities_posts_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_member_search_username(
  connection: api.IConnection,
): Promise<void> {
  // Create connections for different actors
  const adminConnection: api.IConnection = { host: connection.host };
  const guestConnection: api.IConnection = { host: connection.host };
  // Step 1: Create member accounts using utility functions
  const aliceSmith = await authorize_member_join(adminConnection, {
    body: {
      email: "alice_smith@example.com",
      password: "password123",
    },
  });
  const alice123 = await authorize_member_join(adminConnection, {
    body: {
      email: "alice123@example.com",
      password: "password123",
    },
  });
  const myAlice = await authorize_member_join(adminConnection, {
    body: {
      email: "my_alice@example.com",
      password: "password123",
    },
  });
  const aliceBan = await authorize_member_join(adminConnection, {
    body: {
      email: "alice_ban@example.com",
      password: "password123",
    },
  });
  // Step 2: Create a post in a community as prerequisite for the scenario
  const communityName = "test-community";
  await generate_random_community_platform_member_communities_posts_create(
    adminConnection,
    {
      params: { communityName },
      body: {
        title: "Test post for searching members",
        text: "This is a test post to create context for search functionality.",
      },
    },
  );
  // Step 3: Test search with unauthenticated guest connection
  const searchResult =
    await api.functional.communityPlatform.member.search.members.search(
      guestConnection,
      {
        body: {
          search: "alice", // Search term should match the members created
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(searchResult);
  TestValidator.equals(
    "search returns a page",
    searchResult.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "search returns a data array",
    Array.isArray(searchResult.data),
    true,
  );
  // Validate that search returns at least 3 results (alice_smith, alice123, my_alice)
  TestValidator.predicate(
    "search returns at least 3 results",
    () => searchResult.data.length >= 3,
  );
  // Step 4: Test with authenticated connection
  const authConnection: api.IConnection = { host: connection.host };
  const authMember = await authorize_member_login(authConnection, {
    body: {
      email: "alice_smith@example.com",
      password: "password123",
    },
  });
  const authSearchResult =
    await api.functional.communityPlatform.member.search.members.search(
      authConnection,
      {
        body: {
          search: "alice",
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(authSearchResult);
  TestValidator.equals(
    "authenticated search returns same number of results",
    authSearchResult.data.length,
    searchResult.data.length,
  );
  // Step 5: Test pagination limits - max 100 results
  const largeSearch =
    await api.functional.communityPlatform.member.search.members.search(
      guestConnection,
      {
        body: {
          search: "alice",
          limit: 100,
        },
      },
    );
  typia.assert(largeSearch);
  TestValidator.equals(
    "limit respects maximum of 100",
    largeSearch.data.length <= 100,
    true,
  );
  // Step 6: Test empty search term - should fail
  await TestValidator.error("empty search term should fail", async () => {
    await api.functional.communityPlatform.member.search.members.search(
      guestConnection,
      {
        body: {
          search: "", // Empty string should be invalid
          page: 1,
          limit: 10,
        },
      },
    );
  });
  // Step 7: Test with non-existent search term
  const noResults =
    await api.functional.communityPlatform.member.search.members.search(
      guestConnection,
      {
        body: {
          search: "nonexistentuser",
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(noResults);
  TestValidator.equals(
    "no results for non-existent username",
    noResults.data.length,
    0,
  );
  // Step 8: Test pagination page number
  const page2Search =
    await api.functional.communityPlatform.member.search.members.search(
      guestConnection,
      {
        body: {
          search: "alice",
          page: 2,
          limit: 2,
        },
      },
    );
  typia.assert(page2Search);
  TestValidator.equals(
    "second page has correct pagination info",
    page2Search.pagination.current,
    2,
  );
  TestValidator.equals(
    "second page has correct limit",
    page2Search.pagination.limit,
    2,
  );
  TestValidator.equals(
    "second page returned some results",
    page2Search.data.length > 0,
    true,
  );
}
