import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityForumAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumAuthorizationToken";
import type { ICommunityForumCommunityGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityGroup";
import type { ICommunityForumCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityForumCommunityGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityForumCommunityGroup";

export async function test_api_search_communities_public(
  connection: api.IConnection,
) {
  // Create a test user for community creation
  const userJoin = await api.functional.auth.user.join(connection, {
    body: {
      email: `${RandomGenerator.alphabets(10)}@test.com`,
      password: "password123",
      username: RandomGenerator.alphabets(8),
    } satisfies ICommunityForumCommunityUser.IJoin,
  });
  typia.assert(userJoin);

  // Create multiple test communities with various properties
  const communities: ICommunityForumCommunityGroup[] = [];

  // Create public communities
  for (let i = 0; i < 5; i++) {
    const community =
      await api.functional.communityForum.user.communities.create(connection, {
        body: {
          name: `public-community-${RandomGenerator.alphabets(5)}-${i}`,
          slug: `public-community-${RandomGenerator.alphabets(5)}-${i}`,
          title: `Public Community ${i}`,
          description: RandomGenerator.paragraph({ sentences: 5 }),
          rules: RandomGenerator.paragraph({ sentences: 3 }),
          privacy_level: "public",
          status: "active",
        } satisfies ICommunityForumCommunityGroup.ICreate,
      });
    typia.assert(community);
    communities.push(community);
  }

  // Create private communities
  for (let i = 0; i < 3; i++) {
    const community =
      await api.functional.communityForum.user.communities.create(connection, {
        body: {
          name: `private-community-${RandomGenerator.alphabets(5)}-${i}`,
          slug: `private-community-${RandomGenerator.alphabets(5)}-${i}`,
          title: `Private Community ${i}`,
          description: RandomGenerator.paragraph({ sentences: 5 }),
          rules: RandomGenerator.paragraph({ sentences: 3 }),
          privacy_level: "private",
          status: "active",
        } satisfies ICommunityForumCommunityGroup.ICreate,
      });
    typia.assert(community);
    communities.push(community);
  }

  // Create restricted communities
  for (let i = 0; i < 2; i++) {
    const community =
      await api.functional.communityForum.user.communities.create(connection, {
        body: {
          name: `restricted-community-${RandomGenerator.alphabets(5)}-${i}`,
          slug: `restricted-community-${RandomGenerator.alphabets(5)}-${i}`,
          title: `Restricted Community ${i}`,
          description: RandomGenerator.paragraph({ sentences: 5 }),
          rules: RandomGenerator.paragraph({ sentences: 3 }),
          privacy_level: "restricted",
          status: "active",
        } satisfies ICommunityForumCommunityGroup.ICreate,
      });
    typia.assert(community);
    communities.push(community);
  }

  // Test 1: Search all public communities
  const publicCommunitiesResult =
    await api.functional.communityForum.communities.index(connection, {
      body: {
        privacy_levels: ["public"],
      } satisfies ICommunityForumCommunityGroup.IRequest,
    });
  typia.assert(publicCommunitiesResult);

  TestValidator.equals(
    "should return only public communities",
    publicCommunitiesResult.data.every((c) => c.privacy_level === "public"),
    true,
  );

  TestValidator.predicate(
    "should return correct pagination for public communities",
    () =>
      publicCommunitiesResult.pagination.records >= 5 &&
      publicCommunitiesResult.pagination.limit >= 5,
  );

  // Test 2: Search communities with keyword
  const searchTerm = "Public Community 1";
  const keywordSearchResult =
    await api.functional.communityForum.communities.index(connection, {
      body: {
        search: searchTerm,
      } satisfies ICommunityForumCommunityGroup.IRequest,
    });
  typia.assert(keywordSearchResult);

  TestValidator.predicate(
    "should return communities matching keyword search",
    () =>
      keywordSearchResult.data.some(
        (c) =>
          c.title.includes("Public Community 1") ||
          c.name.includes("public-community") ||
          c.description.includes("Public Community 1"),
      ),
  );

  // Test 3: Search with multiple privacy levels
  const multiPrivacyResult =
    await api.functional.communityForum.communities.index(connection, {
      body: {
        privacy_levels: ["public", "restricted"],
      } satisfies ICommunityForumCommunityGroup.IRequest,
    });
  typia.assert(multiPrivacyResult);

  TestValidator.equals(
    "should return public and restricted communities only",
    multiPrivacyResult.data.every(
      (c) => c.privacy_level === "public" || c.privacy_level === "restricted",
    ),
    true,
  );

  // Test 4: Search with status filter
  const statusFilterResult =
    await api.functional.communityForum.communities.index(connection, {
      body: {
        statuses: ["active"],
      } satisfies ICommunityForumCommunityGroup.IRequest,
    });
  typia.assert(statusFilterResult);

  TestValidator.equals(
    "should return only active communities",
    statusFilterResult.data.every((c) => c.status === "active"),
    true,
  );

  // Test 5: Search with sorting
  const sortedResult = await api.functional.communityForum.communities.index(
    connection,
    {
      body: {
        sort_by: "created_at",
        sort_order: "desc",
      } satisfies ICommunityForumCommunityGroup.IRequest,
    },
  );
  typia.assert(sortedResult);

  // Test 6: Search with pagination
  const paginatedResult = await api.functional.communityForum.communities.index(
    connection,
    {
      body: {
        page: 1,
        limit: 3,
      } satisfies ICommunityForumCommunityGroup.IRequest,
    },
  );
  typia.assert(paginatedResult);

  TestValidator.predicate(
    "should return correct pagination info",
    () =>
      paginatedResult.pagination.current === 1 &&
      paginatedResult.pagination.limit === 3 &&
      paginatedResult.data.length <= 3,
  );

  // Test 7: Combined search criteria
  const combinedResult = await api.functional.communityForum.communities.index(
    connection,
    {
      body: {
        privacy_levels: ["public"],
        statuses: ["active"],
        sort_by: "name",
        sort_order: "asc",
        limit: 10,
      } satisfies ICommunityForumCommunityGroup.IRequest,
    },
  );
  typia.assert(combinedResult);

  TestValidator.equals(
    "should return only public active communities sorted by name",
    combinedResult.data.every(
      (c) => c.privacy_level === "public" && c.status === "active",
    ),
    true,
  );

  // Validate sorting
  for (let i = 0; i < combinedResult.data.length - 1; i++) {
    TestValidator.predicate(
      `communities should be sorted by name in ascending order at index ${i}`,
      () => combinedResult.data[i].name <= combinedResult.data[i + 1].name,
    );
  }
}
