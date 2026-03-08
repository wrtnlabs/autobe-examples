import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformMember";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_users_list_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Basic retrieval with search by displayName
  const displayName = typia.random<string & tags.Format<"email">>();
  const searchByDisplayName = await api.functional.redditPlatform.users.index(
    connection,
    {
      body: {
        displayName: displayName.substring(0, 5),
      } satisfies IRedditPlatformMember.IRequest,
    },
  );
  typia.assert(searchByDisplayName);
  typia.assert(searchByDisplayName.pagination);
  typia.assert(Array.isArray(searchByDisplayName.data));
  // Test 2: Search by username
  const username = typia.random<string & tags.Format<"email">>();
  const searchByUsername = await api.functional.redditPlatform.users.index(
    connection,
    {
      body: {
        username: username.substring(0, 5),
      } satisfies IRedditPlatformMember.IRequest,
    },
  );
  typia.assert(searchByUsername);
  typia.assert(searchByUsername.pagination);
  typia.assert(Array.isArray(searchByUsername.data));
  // Test 3: Filter by karmaScoreMin
  const karmaMin = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<0>
  >();
  const filterByKarmaMin = await api.functional.redditPlatform.users.index(
    connection,
    {
      body: {
        karmaScoreMin: karmaMin,
      } satisfies IRedditPlatformMember.IRequest,
    },
  );
  typia.assert(filterByKarmaMin);
  TestValidator.predicate(
    "filter by karmaScoreMin returns users with karma >= min",
    filterByKarmaMin.data.every((user) => user.karmaScore >= karmaMin),
  );
  // Test 4: Filter by karmaScoreMax
  const karmaMax = typia.random<
    number & tags.Type<"int32"> & tags.Maximum<1000000>
  >();
  const filterByKarmaMax = await api.functional.redditPlatform.users.index(
    connection,
    {
      body: {
        karmaScoreMax: karmaMax,
      } satisfies IRedditPlatformMember.IRequest,
    },
  );
  typia.assert(filterByKarmaMax);
  TestValidator.predicate(
    "filter by karmaScoreMax returns users with karma <= max",
    filterByKarmaMax.data.every((user) => user.karmaScore <= karmaMax),
  );
  // Test 5: Combined karma filter
  const karmaMin2 = 0;
  const karmaMax2 = 10000;
  const combinedKarmaFilter = await api.functional.redditPlatform.users.index(
    connection,
    {
      body: {
        karmaScoreMin: karmaMin2,
        karmaScoreMax: karmaMax2,
      } satisfies IRedditPlatformMember.IRequest,
    },
  );
  typia.assert(combinedKarmaFilter);
  TestValidator.predicate(
    "combined karma filter works",
    combinedKarmaFilter.data.every(
      (user) => user.karmaScore >= karmaMin2 && user.karmaScore <= karmaMax2,
    ),
  );
  // Test 6: Sort by karmaScore DESC
  const sortKarmaDesc = await api.functional.redditPlatform.users.index(
    connection,
    {
      body: {
        sortBy: "karmaScore",
        sortOrder: "DESC",
      } satisfies IRedditPlatformMember.IRequest,
    },
  );
  typia.assert(sortKarmaDesc);
  TestValidator.predicate(
    "sort by karmaScore DESC returns descending order",
    sortKarmaDesc.data.length < 2 ||
      sortKarmaDesc.data.every(
        (user, index) =>
          index === 0 ||
          sortKarmaDesc.data[index - 1].karmaScore >= user.karmaScore,
      ),
  );
  // Test 7: Sort by createdAt ASC
  const sortCreatedAsc = await api.functional.redditPlatform.users.index(
    connection,
    {
      body: {
        sortBy: "createdAt",
        sortOrder: "ASC",
      } satisfies IRedditPlatformMember.IRequest,
    },
  );
  typia.assert(sortCreatedAsc);
  TestValidator.predicate(
    "sort by createdAt ASC returns ascending order",
    sortCreatedAsc.data.length < 2 ||
      sortCreatedAsc.data.every(
        (user, index) =>
          index === 0 ||
          sortCreatedAsc.data[index - 1].createdAt <= user.createdAt,
      ),
  );
  // Test 8: Sort by subscriptionCount DESC
  const sortSubsDesc = await api.functional.redditPlatform.users.index(
    connection,
    {
      body: {
        sortBy: "subscriptionCount",
        sortOrder: "DESC",
      } satisfies IRedditPlatformMember.IRequest,
    },
  );
  typia.assert(sortSubsDesc);
  TestValidator.predicate(
    "sort by subscriptionCount DESC returns descending order",
    sortSubsDesc.data.length < 2 ||
      sortSubsDesc.data.every(
        (user, index) =>
          index === 0 ||
          sortSubsDesc.data[index - 1].subscriptionCount >=
            user.subscriptionCount,
      ),
  );
  // Test 9: Pagination - page 1 with default limit
  const page1 = await api.functional.redditPlatform.users.index(connection, {
    body: {
      page: 1,
      limit: 20,
    } satisfies IRedditPlatformMember.IRequest,
  });
  typia.assert(page1);
  TestValidator.equals(
    "pagination page 1 metadata - current",
    page1.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination page 1 metadata - limit",
    page1.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination page 1 records count >= actual data",
    page1.pagination.records >= page1.data.length,
  );
  TestValidator.predicate(
    "pagination page 1 pages calculation",
    page1.pagination.pages ===
      Math.ceil(page1.pagination.records / page1.pagination.limit),
  );
  // Test 10: Pagination - page 2
  const page2 = await api.functional.redditPlatform.users.index(connection, {
    body: {
      page: 2,
      limit: 20,
    } satisfies IRedditPlatformMember.IRequest,
  });
  typia.assert(page2);
  TestValidator.equals(
    "pagination page 2 metadata - current",
    page2.pagination.current,
    2,
  );
  TestValidator.equals(
    "pagination page 2 records same as page 1",
    page2.pagination.records,
    page1.pagination.records,
  );
  // Test 11: Pagination - different limit
  const limit50 = await api.functional.redditPlatform.users.index(connection, {
    body: {
      limit: 50,
    } satisfies IRedditPlatformMember.IRequest,
  });
  typia.assert(limit50);
  TestValidator.equals("pagination limit 50", limit50.pagination.limit, 50);
  // Test 12: Combined search, filter, sort, and pagination
  const complexQuery = await api.functional.redditPlatform.users.index(
    connection,
    {
      body: {
        displayName: "test",
        karmaScoreMin: 100,
        karmaScoreMax: 1000,
        sortBy: "karmaScore",
        sortOrder: "DESC",
        page: 1,
        limit: 10,
      } satisfies IRedditPlatformMember.IRequest,
    },
  );
  typia.assert(complexQuery);
  TestValidator.predicate(
    "complex query respects all filters",
    complexQuery.data.every(
      (user) =>
        user.displayName.toLowerCase().includes("test".toLowerCase()) &&
        user.karmaScore >= 100 &&
        user.karmaScore <= 1000,
    ),
  );
}
