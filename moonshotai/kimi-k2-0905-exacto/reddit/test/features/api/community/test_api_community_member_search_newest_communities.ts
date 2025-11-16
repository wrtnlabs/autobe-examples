import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityCategories";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";

/**
 * Test community search functionality where a member discovers newly created
 * communities with the newest sort order.
 *
 * This test validates:
 *
 * 1. Member authentication for search access
 * 2. Community creation with specific timestamps
 * 3. Sorting by creation date in descending order (newest first)
 * 4. Proper pagination and result structure
 * 5. Complete community information including name, title, type, subscriber count,
 *    and category
 * 6. Business logic that newest communities should appear first in search results
 *
 * The test creates multiple communities with different creation times, then
 * searches with 'newest' sort order to verify proper chronological ordering in
 * the response.
 */
export async function test_api_community_member_search_newest_communities(
  connection: api.IConnection,
) {
  // Step 1: Register as member to access community functionality
  const memberData = {
    nickname: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "testPassword123!",
  } satisfies IRedditCommunityMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(member);

  // Step 2: Create communities one by one to ensure different timestamps
  const categories = ["Programming", "Technology", "Design"] as const;
  const types: ("public" | "restricted" | "private")[] = [
    "public",
    "public",
    "restricted",
  ] as const;

  // Create first community (will be oldest)
  const community1 =
    await api.functional.redditCommunity.member.communities.create(connection, {
      body: {
        name: RandomGenerator.alphaNumeric(10),
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 8,
          sentenceMax: 15,
        }),
        category_name: categories[0],
        type: types[0],
        allow_crosspost: false,
      } satisfies IRedditCommunityCommunity.ICreate,
    });
  typia.assert(community1);

  // Create second community (will be middle)
  const community2 =
    await api.functional.redditCommunity.member.communities.create(connection, {
      body: {
        name: RandomGenerator.alphaNumeric(10),
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 10,
          sentenceMax: 12,
        }),
        category_name: categories[1],
        type: types[1],
        allow_crosspost: true,
      } satisfies IRedditCommunityCommunity.ICreate,
    });
  typia.assert(community2);

  // Create third community (will be newest)
  const community3 =
    await api.functional.redditCommunity.member.communities.create(connection, {
      body: {
        name: RandomGenerator.alphaNumeric(10),
        title: RandomGenerator.paragraph({ sentences: 4 }),
        description: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 6,
          sentenceMax: 10,
        }),
        category_name: categories[2],
        type: types[2],
        allow_crosspost: false,
      } satisfies IRedditCommunityCommunity.ICreate,
    });
  typia.assert(community3);

  // Step 3: Search communities with newest sort order
  const searchResult =
    await api.functional.redditCommunity.member.communities.index(connection, {
      body: {
        page: 0,
        limit: 10,
        sort_order: "newest",
      } satisfies IRedditCommunityCommunity.IRequest,
    });
  typia.assert(searchResult);

  // Validate pagination structure
  TestValidator.predicate(
    "search result has pagination",
    searchResult.pagination !== undefined &&
      searchResult.pagination.current === 0 &&
      searchResult.pagination.limit === 10,
  );

  // Validate all created communities appear in results
  const resultCommunityIds = searchResult.data.map((community) => community.id);
  TestValidator.predicate(
    "all created communities appear in results",
    resultCommunityIds.includes(community1.id) &&
      resultCommunityIds.includes(community2.id) &&
      resultCommunityIds.includes(community3.id),
  );

  // Find created communities in search results
  const foundCommunity1 = searchResult.data.find((c) => c.id === community1.id);
  const foundCommunity2 = searchResult.data.find((c) => c.id === community2.id);
  const foundCommunity3 = searchResult.data.find((c) => c.id === community3.id);

  // Validate community completeness with detailed properties
  TestValidator.predicate(
    "community 1 has complete required data",
    foundCommunity1 !== undefined &&
      typeof foundCommunity1.name === "string" &&
      typeof foundCommunity1.title === "string" &&
      typeof foundCommunity1.type === "string" &&
      typeof foundCommunity1.subscriber_count === "number" &&
      foundCommunity1.subscriber_count >= 0,
  );

  TestValidator.predicate(
    "community 2 has complete required data",
    foundCommunity2 !== undefined &&
      typeof foundCommunity2.name === "string" &&
      typeof foundCommunity2.title === "string" &&
      typeof foundCommunity2.type === "string" &&
      typeof foundCommunity2.subscriber_count === "number" &&
      foundCommunity2.subscriber_count >= 0,
  );

  TestValidator.predicate(
    "community 3 has complete required data",
    foundCommunity3 !== undefined &&
      typeof foundCommunity3.name === "string" &&
      typeof foundCommunity3.title === "string" &&
      typeof foundCommunity3.type === "string" &&
      typeof foundCommunity3.subscriber_count === "number" &&
      foundCommunity3.subscriber_count >= 0,
  );

  // Validate sorting - newer communities should appear first
  const community3Index = resultCommunityIds.indexOf(community3.id);
  const community2Index = resultCommunityIds.indexOf(community2.id);
  const community1Index = resultCommunityIds.indexOf(community1.id);

  TestValidator.predicate(
    "newest community appears before older communities",
    community3Index < community2Index && community2Index < community1Index,
  );

  // Validate crosspost settings
  TestValidator.equals(
    "community 1 crosspost setting",
    foundCommunity1?.allow_crosspost,
    false,
  );
  TestValidator.equals(
    "community 2 crosspost setting",
    foundCommunity2?.allow_crosspost,
    true,
  );
  TestValidator.equals(
    "community 3 crosspost setting",
    foundCommunity3?.allow_crosspost,
    false,
  );

  // Test pagination with smaller limit
  const paginatedResult =
    await api.functional.redditCommunity.member.communities.index(connection, {
      body: {
        page: 0,
        limit: 2,
        sort_order: "newest",
      } satisfies IRedditCommunityCommunity.IRequest,
    });
  typia.assert(paginatedResult);

  TestValidator.equals(
    "paginated search respects limit",
    paginatedResult.pagination.limit,
    2,
  );
  TestValidator.predicate(
    "paginated data respects limit",
    paginatedResult.data.length <= 2,
  );

  // Test category filter
  const categoryResult =
    await api.functional.redditCommunity.member.communities.index(connection, {
      body: {
        page: 0,
        limit: 10,
        category_name: categories[0],
        sort_order: "newest",
      } satisfies IRedditCommunityCommunity.IRequest,
    });
  typia.assert(categoryResult);

  TestValidator.predicate(
    "filtered results have matching category",
    categoryResult.data.length > 0 &&
      categoryResult.data.every((c) => c.category?.name === categories[0]),
  );
}
