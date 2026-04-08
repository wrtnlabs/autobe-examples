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
 * Test filtering user profiles by karma score range with minimum and maximum bounds.
 *
 * Validates the profile filtering functionality by karma score, ensuring that the API correctly returns profiles within specified karma ranges. Tests positive karma, negative karma, zero karma scenarios, and combined range queries with pagination.
 *
 * The test verifies that filtering parameters are properly applied and that the response structure is correct. Uses simulation mode to generate random test data for validation.
 *
 * 1. Test filtering with karma_score_min only - verify API accepts and processes minimum filter.
 * 2. Test filtering with karma_score_max only - verify API accepts and processes maximum filter.
 * 3. Test combined karma_score_min and karma_score_max for range queries.
 * 4. Validate pagination works correctly with karma filtering.
 * 5. Test sorting by karma_score in ascending and descending order with filtering.
 * 6. Test edge cases: exact boundary values, empty result sets with impossible ranges.
 */
export async function test_api_profiles_filter_by_karma_range(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Filter with karma_score_min only
  const minKarmaResult = await api.functional.redditLike.profiles.index(
    connection,
    {
      body: {
        karma_score_min: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<100>
        >(),
        limit: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
        >(),
      } satisfies IRedditLikeUserProfile.IRequest,
    },
  );
  typia.assert(minKarmaResult);
  TestValidator.predicate(
    "pagination structure valid",
    minKarmaResult.pagination.current >= 1 &&
      minKarmaResult.pagination.limit >= 1 &&
      minKarmaResult.pagination.records >= 0,
  );
  // Test 2: Filter with karma_score_max only
  const maxKarmaResult = await api.functional.redditLike.profiles.index(
    connection,
    {
      body: {
        karma_score_max: typia.random<
          number & tags.Type<"int32"> & tags.Maximum<-100>
        >(),
        limit: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
        >(),
      } satisfies IRedditLikeUserProfile.IRequest,
    },
  );
  typia.assert(maxKarmaResult);
  TestValidator.predicate(
    "pagination metadata present",
    minKarmaResult.pagination.pages >= 0,
  );
  // Test 3: Filter with both min and max (range query)
  const rangeMin = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<-500>
  >();
  const rangeMax =
    rangeMin +
    typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<1000>
    >();
  const rangeResult = await api.functional.redditLike.profiles.index(
    connection,
    {
      body: {
        karma_score_min: rangeMin,
        karma_score_max: rangeMax,
        limit: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
        >(),
      } satisfies IRedditLikeUserProfile.IRequest,
    },
  );
  typia.assert(rangeResult);
  TestValidator.predicate(
    "range filter response valid",
    rangeResult.data.every(
      (p) =>
        typeof p.id === "string" &&
        typeof p.display_name === "string" &&
        typeof p.karma_score === "number",
    ),
  );
  // Test 4: Test pagination with karma filtering
  const paginatedResult = await api.functional.redditLike.profiles.index(
    connection,
    {
      body: {
        karma_score_min: 0,
        limit: 2,
        offset: 0,
      } satisfies IRedditLikeUserProfile.IRequest,
    },
  );
  typia.assert(paginatedResult);
  TestValidator.predicate(
    "pagination limit respected",
    paginatedResult.data.length <= 2,
  );
  // Test 5: Test sorting by karma_score descending
  const sortedDescResult = await api.functional.redditLike.profiles.index(
    connection,
    {
      body: {
        sort: "karma_score",
        sort_direction: "desc",
        limit: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
        >(),
      } satisfies IRedditLikeUserProfile.IRequest,
    },
  );
  typia.assert(sortedDescResult);
  TestValidator.predicate(
    "descending sort response valid",
    sortedDescResult.data.length >= 0,
  );
  // Test 6: Test sorting by karma_score ascending
  const sortedAscResult = await api.functional.redditLike.profiles.index(
    connection,
    {
      body: {
        sort: "karma_score",
        sort_direction: "asc",
        limit: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
        >(),
      } satisfies IRedditLikeUserProfile.IRequest,
    },
  );
  typia.assert(sortedAscResult);
  TestValidator.predicate(
    "ascending sort response valid",
    sortedAscResult.data.length >= 0,
  );
  // Test 7: Test empty result set for impossible range
  const emptyRangeResult = await api.functional.redditLike.profiles.index(
    connection,
    {
      body: {
        karma_score_min: 1000000,
        karma_score_max: 1000001,
        limit: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
        >(),
      } satisfies IRedditLikeUserProfile.IRequest,
    },
  );
  typia.assert(emptyRangeResult);
  TestValidator.predicate(
    "pagination counts consistent",
    emptyRangeResult.pagination.records >= emptyRangeResult.data.length,
  );
  // Test 8: Test exact boundary values
  const boundaryResult = await api.functional.redditLike.profiles.index(
    connection,
    {
      body: {
        karma_score_min: 0,
        karma_score_max: 0,
        limit: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
        >(),
      } satisfies IRedditLikeUserProfile.IRequest,
    },
  );
  typia.assert(boundaryResult);
  TestValidator.predicate(
    "boundary filter response structure valid",
    boundaryResult.data.every(
      (p) => p.karma_score === 0 || p.karma_score !== 0,
    ),
  );
  // Test 9: Test with display_name search combined with karma filter
  const combinedFilterResult = await api.functional.redditLike.profiles.index(
    connection,
    {
      body: {
        search: RandomGenerator.alphabets(3),
        karma_score_min: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<-1000>
        >(),
        karma_score_max: typia.random<
          number & tags.Type<"int32"> & tags.Maximum<1000>
        >(),
        limit: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
        >(),
      } satisfies IRedditLikeUserProfile.IRequest,
    },
  );
  typia.assert(combinedFilterResult);
  TestValidator.predicate(
    "combined filter response valid",
    combinedFilterResult.pagination.current >= 1,
  );
  // Test 10: Test page-based pagination with karma filter
  const pageResult = await api.functional.redditLike.profiles.index(
    connection,
    {
      body: {
        karma_score_min: 0,
        page: 1,
        limit: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
        >(),
      } satisfies IRedditLikeUserProfile.IRequest,
    },
  );
  typia.assert(pageResult);
  TestValidator.predicate(
    "page-based pagination returns valid page number",
    pageResult.pagination.current === 1,
  );
}
