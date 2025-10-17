import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunity";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";

export async function test_api_community_search_by_category(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a member account for API access
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.MinLength<8>>();
  const memberUsername = RandomGenerator.alphaNumeric(
    typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<3> & tags.Maximum<20>
    >(),
  );

  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: memberUsername,
      email: memberEmail,
      password: memberPassword,
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Get all communities without any filter to establish baseline
  const allCommunitiesResult =
    await api.functional.redditLike.communities.index(connection, {
      body: {
        page: 1,
        limit: 100,
      } satisfies IRedditLikeCommunity.IRequest,
    });
  typia.assert(allCommunitiesResult);
  typia.assert(allCommunitiesResult.pagination);

  // Extract all unique categories from existing communities
  const existingCategories = new Set<string>();
  for (const community of allCommunitiesResult.data) {
    if (community.primary_category) {
      existingCategories.add(community.primary_category);
    }
  }

  // Step 3: Test category filtering for each existing category
  for (const category of existingCategories) {
    const categoryFilterResult =
      await api.functional.redditLike.communities.index(connection, {
        body: {
          primary_category: category,
          page: 1,
          limit: 50,
        } satisfies IRedditLikeCommunity.IRequest,
      });
    typia.assert(categoryFilterResult);
    typia.assert(categoryFilterResult.pagination);

    // Validate that all returned communities match the filtered category
    for (const community of categoryFilterResult.data) {
      TestValidator.equals(
        `filtered community should have category ${category}`,
        community.primary_category,
        category,
      );
    }

    // Validate that filtered results are a subset of all communities
    TestValidator.predicate(
      "filtered result count should not exceed total communities",
      categoryFilterResult.data.length <= allCommunitiesResult.data.length,
    );
  }

  // Step 4: Test that different category filters return different communities (if multiple categories exist)
  const categoryArray = Array.from(existingCategories);
  if (categoryArray.length >= 2) {
    const firstCategory = categoryArray[0];
    const secondCategory = categoryArray[1];

    const firstCategoryResult =
      await api.functional.redditLike.communities.index(connection, {
        body: {
          primary_category: firstCategory,
          page: 1,
          limit: 50,
        } satisfies IRedditLikeCommunity.IRequest,
      });
    typia.assert(firstCategoryResult);

    const secondCategoryResult =
      await api.functional.redditLike.communities.index(connection, {
        body: {
          primary_category: secondCategory,
          page: 1,
          limit: 50,
        } satisfies IRedditLikeCommunity.IRequest,
      });
    typia.assert(secondCategoryResult);

    // Verify category consistency in each result set
    for (const community of firstCategoryResult.data) {
      TestValidator.equals(
        `community in first category filter should match ${firstCategory}`,
        community.primary_category,
        firstCategory,
      );
    }

    for (const community of secondCategoryResult.data) {
      TestValidator.equals(
        `community in second category filter should match ${secondCategory}`,
        community.primary_category,
        secondCategory,
      );
    }
  }

  // Step 5: Test pagination parameters work correctly with category filter
  if (existingCategories.size > 0) {
    const testCategory = categoryArray[0];
    const paginatedResult = await api.functional.redditLike.communities.index(
      connection,
      {
        body: {
          primary_category: testCategory,
          page: 1,
          limit: 5,
        } satisfies IRedditLikeCommunity.IRequest,
      },
    );
    typia.assert(paginatedResult);
    typia.assert(paginatedResult.pagination);

    TestValidator.equals(
      "pagination current page should be 1",
      paginatedResult.pagination.current,
      1,
    );
    TestValidator.equals(
      "pagination limit should be 5",
      paginatedResult.pagination.limit,
      5,
    );
    TestValidator.predicate(
      "returned data should not exceed limit",
      paginatedResult.data.length <= 5,
    );
  }
}
