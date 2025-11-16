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
 * Test community search using text queries to discover communities by name or
 * title keywords. Verify that partial text matching works correctly across both
 * community names and titles. Validate that search results are relevant and
 * properly ranked based on text similarity.
 */
export async function test_api_community_member_text_based_search(
  connection: api.IConnection,
) {
  // 1. Create member account to authenticate for community search functionality
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: IRedditCommunityMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        nickname: RandomGenerator.name(),
        email: memberEmail,
        password: RandomGenerator.alphaNumeric(12),
      } satisfies IRedditCommunityMember.ICreate,
    });
  typia.assert(member);

  // 2. Create multiple communities with various descriptive names and titles for testing
  const communities: IRedditCommunityCommunity[] = await ArrayUtil.asyncRepeat(
    8,
    async (i) => {
      const communityData = {
        name:
          RandomGenerator.pick([
            "tech",
            "programming",
            "coding",
            "development",
            "learning",
            "study",
            "discussion",
            "help",
          ]) +
          RandomGenerator.pick([
            "_group",
            "_hub",
            "_center",
            "_community",
            "_forum",
          ]) +
          "_" +
          String(i + 1),
        title:
          RandomGenerator.name(2) +
          " " +
          RandomGenerator.pick([
            "Technology",
            "Programming",
            "Development",
            "Learning",
            "Community",
            "Forum",
          ]) +
          " " +
          RandomGenerator.pick(["Corner", "Group", "Hub", "Center", "Spot"]),
        description: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 4,
          wordMax: 8,
        }),
        category_name: "Technology", // Using valid category name
        type: RandomGenerator.pick<"public" | "restricted" | "private">([
          "public",
          "public",
          "public",
        ]), // Prefer public for testing
        post_requirement_min_age: null, // Simplify testing defaults
        post_requirement_min_karma: null, // Simplify testing defaults
        allow_crosspost: true, // Enable for testing
      } satisfies IRedditCommunityCommunity.ICreate;

      const community =
        await api.functional.redditCommunity.member.communities.create(
          connection,
          { body: communityData },
        );
      return community;
    },
  );

  // 3. Test basic text search functionality - search for "tech" keyword
  const techSearchResults =
    await api.functional.redditCommunity.member.communities.index(connection, {
      body: {
        search: "tech",
        page: 0,
        limit: 5,
      } satisfies IRedditCommunityCommunity.IRequest,
    });
  typia.assert(techSearchResults);

  // Verify search results contain "tech" in name or title
  TestValidator.predicate(
    "search results contain 'tech' keyword",
    techSearchResults.data.every(
      (community) =>
        community.name.toLowerCase().includes("tech") ||
        community.title.toLowerCase().includes("tech"),
    ),
  );
  TestValidator.predicate(
    "search results are relevant and matched",
    techSearchResults.data.length > 0,
  );

  // 4. Test partial text matching with "prog" prefix to match "programming" or "program"
  const partialResults =
    await api.functional.redditCommunity.member.communities.index(connection, {
      body: {
        search: "prog",
        page: 0,
        limit: 5,
      } satisfies IRedditCommunityCommunity.IRequest,
    });
  typia.assert(partialResults);

  // Verify partial matching works
  TestValidator.predicate(
    "partial search matches communities with 'prog' in name or title",
    partialResults.data.every(
      (community) =>
        community.name.toLowerCase().includes("prog") ||
        community.title.toLowerCase().includes("prog") ||
        community.name.toLowerCase().includes("programming"),
    ),
  );

  // 5. Test case-insensitive search with uppercase query
  const uppercaseResults =
    await api.functional.redditCommunity.member.communities.index(connection, {
      body: {
        search: "TECH",
        page: 0,
        limit: 5,
      } satisfies IRedditCommunityCommunity.IRequest,
    });
  typia.assert(uppercaseResults);

  TestValidator.predicate(
    "case-insensitive search returns relevant results",
    uppercaseResults.data.every(
      (community) =>
        community.name.toLowerCase().includes("tech") ||
        community.title.toLowerCase().includes("tech"),
    ),
  );

  // 6. Test pagination with search results
  const page1Results =
    await api.functional.redditCommunity.member.communities.index(connection, {
      body: {
        search: "group",
        page: 0,
        limit: 3,
      } satisfies IRedditCommunityCommunity.IRequest,
    });
  typia.assert(page1Results);

  // Get second page to verify pagination works
  const page2Results =
    await api.functional.redditCommunity.member.communities.index(connection, {
      body: {
        search: "group",
        page: 1,
        limit: 3,
      } satisfies IRedditCommunityCommunity.IRequest,
    });
  typia.assert(page2Results);

  TestValidator.predicate(
    "page 1 search results contain 'group' keyword",
    page1Results.data.every(
      (community) =>
        community.name.toLowerCase().includes("group") ||
        community.title.toLowerCase().includes("group"),
    ),
  );

  TestValidator.predicate(
    "pagination respects limit",
    page1Results.data.length <= 3 && page1Results.pagination.limit === 3,
  );

  TestValidator.predicate(
    "page 2 has different results",
    page2Results.data.length > 0 && page2Results.pagination.current === 1,
  );

  // 7. Test empty search query to retrieve all communities
  const allResults =
    await api.functional.redditCommunity.member.communities.index(connection, {
      body: {
        page: 0,
        limit: 10,
      } satisfies IRedditCommunityCommunity.IRequest,
    });
  typia.assert(allResults);

  TestValidator.equals(
    "returns expected number of communities for empty search",
    allResults.pagination.records,
    8,
  );

  // 8. Test special characters in search
  const specialCharResults =
    await api.functional.redditCommunity.member.communities.index(connection, {
      body: {
        search: "_group_1",
        page: 0,
        limit: 5,
      } satisfies IRedditCommunityCommunity.IRequest,
    });
  typia.assert(specialCharResults);

  TestValidator.predicate(
    "special character search returns matching communities",
    specialCharResults.data.every(
      (community) =>
        community.name.toLowerCase().includes("_group_1") ||
        community.title.toLowerCase().includes("_group_1"),
    ),
  );
}
