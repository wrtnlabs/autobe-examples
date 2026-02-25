import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_user_search_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Test baseline search with empty filters
  const firstPage = await api.functional.communityPlatform.users.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformUser.IRequest,
    },
  );
  typia.assert(firstPage);
  // Validate pagination business logic
  TestValidator.predicate(
    "current page is 1",
    firstPage.pagination.current === 1,
  );
  TestValidator.predicate(
    "limit is within bounds",
    firstPage.pagination.limit >= 1 && firstPage.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "records count is non-negative",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    firstPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pages calculated correctly",
    firstPage.pagination.pages ===
      Math.ceil(firstPage.pagination.records / firstPage.pagination.limit),
  );
  // Validate data array exists
  if (firstPage.data.length > 0) {
    const user = firstPage.data[0];
    typia.assert<ICommunityPlatformUser.ISummary>(user);
    // Test multi-page navigation if available
    if (firstPage.pagination.pages > 1) {
      const secondPage = await api.functional.communityPlatform.users.index(
        connection,
        {
          body: {
            page: 2,
            limit: 10,
          } satisfies ICommunityPlatformUser.IRequest,
        },
      );
      typia.assert(secondPage);
      // Validate pagination consistency
      TestValidator.equals(
        "second page current is 2",
        secondPage.pagination.current,
        2,
      );
      TestValidator.equals(
        "limit remains consistent",
        secondPage.pagination.limit,
        firstPage.pagination.limit,
      );
      TestValidator.equals(
        "total records remain consistent",
        secondPage.pagination.records,
        firstPage.pagination.records,
      );
      TestValidator.equals(
        "total pages remain consistent",
        secondPage.pagination.pages,
        firstPage.pagination.pages,
      );
      // Verify different data between pages
      if (firstPage.data.length > 0 && secondPage.data.length > 0) {
        TestValidator.notEquals(
          "pages have different data",
          firstPage.data[0].id,
          secondPage.data[0].id,
        );
      }
    }
    // Test limit boundaries
    const minLimitPage = await api.functional.communityPlatform.users.index(
      connection,
      {
        body: {
          page: 1,
          limit: 1,
        } satisfies ICommunityPlatformUser.IRequest,
      },
    );
    typia.assert(minLimitPage);
    TestValidator.equals(
      "minimum limit is 1",
      minLimitPage.pagination.limit,
      1,
    );
    const maxLimitPage = await api.functional.communityPlatform.users.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies ICommunityPlatformUser.IRequest,
      },
    );
    typia.assert(maxLimitPage);
    TestValidator.equals(
      "maximum limit is 100",
      maxLimitPage.pagination.limit,
      100,
    );
    // Test page boundary (beyond total pages)
    const beyondPage = await api.functional.communityPlatform.users.index(
      connection,
      {
        body: {
          page: firstPage.pagination.pages + 10,
          limit: 10,
        } satisfies ICommunityPlatformUser.IRequest,
      },
    );
    typia.assert(beyondPage);
    TestValidator.equals(
      "page beyond total returns empty data",
      beyondPage.data.length,
      0,
    );
    TestValidator.equals(
      "current page is requested page",
      beyondPage.pagination.current,
      firstPage.pagination.pages + 10,
    );
    // Test filtered search with karma range
    const filteredSearch = await api.functional.communityPlatform.users.index(
      connection,
      {
        body: {
          karma_min: 10,
          karma_max: 100,
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformUser.IRequest,
      },
    );
    typia.assert(filteredSearch);
    // Validate business logic: karma filtering
    if (filteredSearch.data.length > 0) {
      for (const user of filteredSearch.data) {
        TestValidator.predicate(
          "filtered user karma within specified range",
          user.karma >= 10 && user.karma <= 100,
        );
      }
    }
    // Test with creation date filter
    const currentDate = new Date().toISOString();
    const dateFilteredSearch =
      await api.functional.communityPlatform.users.index(connection, {
        body: {
          created_before: currentDate,
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformUser.IRequest,
      });
    typia.assert(dateFilteredSearch);
    // All user data should be valid ISummary objects
    for (const user of firstPage.data) {
      typia.assert<ICommunityPlatformUser.ISummary>(user);
    }
  }
}
