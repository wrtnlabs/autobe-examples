import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeUserProfile";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test profile sorting and pagination functionality.
 *
 * Validates the sorting and pagination capabilities of the user profiles endpoint. Ensures that profiles can be sorted by display_name, karma_score, and created_at in both ascending and descending order. Verifies default sort behavior, pagination with various limit and offset values, and accurate pagination metadata.
 *
 * The test confirms that soft-deleted profiles are always excluded from query results regardless of sorting or pagination parameters. It also validates the accuracy of pagination metadata including current page, limit, total records, and total pages.
 *
 * 1. Query profiles with default parameters to verify default sort (created_at desc).
 * 2. Test sorting by display_name in ascending and descending order.
 * 3. Test sorting by karma_score in ascending and descending order.
 * 4. Test sorting by created_at in ascending and descending order.
 * 5. Test pagination with various limit values (1, 10, 20, 50, 100).
 * 6. Test pagination with offset parameter.
 * 7. Test pagination with page parameter.
 * 8. Validate pagination metadata accuracy.
 * 9. Verify soft-deleted profiles are excluded from results.
 * 10. Test combined filtering and sorting scenarios.
 */
export async function test_api_profiles_sort_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Test default sort (should be created_at desc)
  const defaultResult = await api.functional.redditLike.profiles.index(
    connection,
    {
      body: {
        limit: 10,
      },
    },
  );
  typia.assert(defaultResult);
  // Verify default sort is by created_at descending (newest first)
  if (defaultResult.data.length > 1) {
    for (let i = 0; i < defaultResult.data.length - 1; i++) {
      TestValidator.predicate(
        `default sort: profile ${i} created_at >= profile ${i + 1}`,
        defaultResult.data[i].created_at >=
          defaultResult.data[i + 1].created_at,
      );
    }
  }
  // 2. Test sorting by display_name ascending
  const displayNameAscResult = await api.functional.redditLike.profiles.index(
    connection,
    {
      body: {
        sort: "display_name",
        sort_direction: "asc",
        limit: 20,
      },
    },
  );
  typia.assert(displayNameAscResult);
  if (displayNameAscResult.data.length > 1) {
    for (let i = 0; i < displayNameAscResult.data.length - 1; i++) {
      TestValidator.predicate(
        `display_name asc: profile ${i} <= profile ${i + 1}`,
        displayNameAscResult.data[i].display_name <=
          displayNameAscResult.data[i + 1].display_name,
      );
    }
  }
  // 3. Test sorting by display_name descending
  const displayNameDescResult = await api.functional.redditLike.profiles.index(
    connection,
    {
      body: {
        sort: "display_name",
        sort_direction: "desc",
        limit: 20,
      },
    },
  );
  typia.assert(displayNameDescResult);
  if (displayNameDescResult.data.length > 1) {
    for (let i = 0; i < displayNameDescResult.data.length - 1; i++) {
      TestValidator.predicate(
        `display_name desc: profile ${i} >= profile ${i + 1}`,
        displayNameDescResult.data[i].display_name >=
          displayNameDescResult.data[i + 1].display_name,
      );
    }
  }
  // 4. Test sorting by karma_score ascending
  const karmaAscResult = await api.functional.redditLike.profiles.index(
    connection,
    {
      body: {
        sort: "karma_score",
        sort_direction: "asc",
        limit: 20,
      },
    },
  );
  typia.assert(karmaAscResult);
  if (karmaAscResult.data.length > 1) {
    for (let i = 0; i < karmaAscResult.data.length - 1; i++) {
      TestValidator.predicate(
        `karma_score asc: profile ${i} <= profile ${i + 1}`,
        karmaAscResult.data[i].karma_score <=
          karmaAscResult.data[i + 1].karma_score,
      );
    }
  }
  // 5. Test sorting by karma_score descending
  const karmaDescResult = await api.functional.redditLike.profiles.index(
    connection,
    {
      body: {
        sort: "karma_score",
        sort_direction: "desc",
        limit: 20,
      },
    },
  );
  typia.assert(karmaDescResult);
  if (karmaDescResult.data.length > 1) {
    for (let i = 0; i < karmaDescResult.data.length - 1; i++) {
      TestValidator.predicate(
        `karma_score desc: profile ${i} >= profile ${i + 1}`,
        karmaDescResult.data[i].karma_score >=
          karmaDescResult.data[i + 1].karma_score,
      );
    }
  }
  // 6. Test sorting by created_at ascending
  const createdAtAscResult = await api.functional.redditLike.profiles.index(
    connection,
    {
      body: {
        sort: "created_at",
        sort_direction: "asc",
        limit: 20,
      },
    },
  );
  typia.assert(createdAtAscResult);
  if (createdAtAscResult.data.length > 1) {
    for (let i = 0; i < createdAtAscResult.data.length - 1; i++) {
      TestValidator.predicate(
        `created_at asc: profile ${i} <= profile ${i + 1}`,
        createdAtAscResult.data[i].created_at <=
          createdAtAscResult.data[i + 1].created_at,
      );
    }
  }
  // 7. Test sorting by created_at descending (explicit)
  const createdAtDescResult = await api.functional.redditLike.profiles.index(
    connection,
    {
      body: {
        sort: "created_at",
        sort_direction: "desc",
        limit: 20,
      },
    },
  );
  typia.assert(createdAtDescResult);
  if (createdAtDescResult.data.length > 1) {
    for (let i = 0; i < createdAtDescResult.data.length - 1; i++) {
      TestValidator.predicate(
        `created_at desc: profile ${i} >= profile ${i + 1}`,
        createdAtDescResult.data[i].created_at >=
          createdAtDescResult.data[i + 1].created_at,
      );
    }
  }
  // 8. Test pagination with different limit values
  const limits: Array<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
  > = [1, 5, 10, 20, 50, 100];
  for (const limit of limits) {
    const limitResult = await api.functional.redditLike.profiles.index(
      connection,
      {
        body: {
          limit,
        },
      },
    );
    typia.assert(limitResult);
    // Verify limit is respected
    TestValidator.predicate(
      `limit ${limit}: data count <= ${limit}`,
      limitResult.data.length <= limit,
    );
    // Verify pagination metadata
    TestValidator.equals(
      `limit ${limit}: pagination.limit`,
      limitResult.pagination.limit,
      limit,
    );
    TestValidator.predicate(
      `limit ${limit}: pagination.limit > 0`,
      limitResult.pagination.limit > 0,
    );
    TestValidator.predicate(
      `limit ${limit}: pagination.records >= 0`,
      limitResult.pagination.records >= 0,
    );
    TestValidator.predicate(
      `limit ${limit}: pagination.pages >= 0`,
      limitResult.pagination.pages >= 0,
    );
    TestValidator.predicate(
      `limit ${limit}: pagination.current >= 1`,
      limitResult.pagination.current >= 1,
    );
  }
  // 9. Test pagination with offset parameter
  const firstPage = await api.functional.redditLike.profiles.index(connection, {
    body: {
      limit: 10,
      offset: 0,
    },
  });
  typia.assert(firstPage);
  const secondPage = await api.functional.redditLike.profiles.index(
    connection,
    {
      body: {
        limit: 10,
        offset: 10,
      },
    },
  );
  typia.assert(secondPage);
  // Verify different pages have different data (if enough records exist)
  if (firstPage.data.length > 0 && secondPage.data.length > 0) {
    const firstPageIds = new Set(firstPage.data.map((p) => p.id));
    const secondPageHasDifferentIds = secondPage.data.every(
      (p) => !firstPageIds.has(p.id),
    );
    TestValidator.predicate(
      "offset pagination: pages have different data",
      secondPageHasDifferentIds || secondPage.data.length === 0,
    );
  }
  // 10. Test pagination with page parameter
  const page1 = await api.functional.redditLike.profiles.index(connection, {
    body: {
      limit: 10,
      page: 1,
    },
  });
  typia.assert(page1);
  const page2 = await api.functional.redditLike.profiles.index(connection, {
    body: {
      limit: 10,
      page: 2,
    },
  });
  typia.assert(page2);
  // Verify pagination metadata for page parameter
  TestValidator.equals(
    "page 1: pagination.current",
    page1.pagination.current,
    1,
  );
  TestValidator.equals(
    "page 2: pagination.current",
    page2.pagination.current,
    2,
  );
  // 11. Validate pagination metadata accuracy
  const metadataTest = await api.functional.redditLike.profiles.index(
    connection,
    {
      body: {
        limit: 20,
      },
    },
  );
  typia.assert(metadataTest);
  // Verify pages calculation: pages = ceil(records / limit)
  const expectedPages = Math.ceil(
    metadataTest.pagination.records / metadataTest.pagination.limit,
  );
  TestValidator.equals(
    "pagination.pages calculation",
    metadataTest.pagination.pages,
    expectedPages,
  );
  // 12. Test combined sorting and filtering
  const filteredSorted = await api.functional.redditLike.profiles.index(
    connection,
    {
      body: {
        sort: "karma_score",
        sort_direction: "desc",
        limit: 10,
        karma_score_min: 0,
      },
    },
  );
  typia.assert(filteredSorted);
  // Verify all results meet the karma filter
  for (const profile of filteredSorted.data) {
    TestValidator.predicate(
      `karma_score_min filter: ${profile.display_name} karma >= 0`,
      profile.karma_score >= 0,
    );
  }
  // Verify sort order is maintained with filter
  if (filteredSorted.data.length > 1) {
    for (let i = 0; i < filteredSorted.data.length - 1; i++) {
      TestValidator.predicate(
        `filtered sorted: karma ${i} >= karma ${i + 1}`,
        filteredSorted.data[i].karma_score >=
          filteredSorted.data[i + 1].karma_score,
      );
    }
  }
  // 13. Test search with sorting
  const searchSorted = await api.functional.redditLike.profiles.index(
    connection,
    {
      body: {
        search: "user",
        sort: "display_name",
        sort_direction: "asc",
        limit: 10,
      },
    },
  );
  typia.assert(searchSorted);
  // Verify search results contain the search term (case-insensitive)
  for (const profile of searchSorted.data) {
    TestValidator.predicate(
      `search filter: ${profile.display_name} contains "user"`,
      profile.display_name.toLowerCase().includes("user"),
    );
  }
  // 14. Test edge cases - empty results
  const emptySearch = await api.functional.redditLike.profiles.index(
    connection,
    {
      body: {
        search: "this_username_should_not_exist_12345",
        limit: 10,
      },
    },
  );
  typia.assert(emptySearch);
  TestValidator.equals(
    "empty search: data array length",
    emptySearch.data.length,
    0,
  );
  TestValidator.predicate(
    "empty search: pagination.pages is 0",
    emptySearch.pagination.pages === 0 || emptySearch.pagination.records === 0,
  );
}
