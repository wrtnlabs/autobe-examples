import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_organization_list_with_search_and_sort(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test search functionality and sorting options for organization listing.
   *
   * 1. Test case-insensitive partial search on organization name
   * 2. Test empty search returns all organizations
   * 3. Test sorting by name (asc/desc)
   * 4. Test sorting by created_at (desc for newest first)
   * 5. Test sorting by updated_at (asc for oldest first)
   * 6. Test combining search and sort parameters
   */
  // Create actor-specific connection (base connection is never used directly)
  const userConnection: api.IConnection = { host: connection.host };
  // 1. Test case-insensitive partial search
  const searchResult = await api.functional.hrmPlatform.organizations.index(
    userConnection,
    {
      body: {
        search: "acme",
      } satisfies IHrmPlatformOrganization.IRequest,
    },
  );
  typia.assert(searchResult);
  // Verify search returns organizations with "acme" in name (case-insensitive)
  TestValidator.predicate(
    "search returns results",
    searchResult.data.length > 0,
  );
  // All results should contain "acme" in name (case-insensitive)
  await ArrayUtil.asyncForEach(searchResult.data, async (org) => {
    TestValidator.predicate(
      `organization name contains "acme" (case-insensitive): ${org.name}`,
      org.name.toLowerCase().includes("acme"),
    );
  });
  // 2. Test empty search returns all organizations
  const allResult = await api.functional.hrmPlatform.organizations.index(
    userConnection,
    {
      body: {
        search: undefined,
      } satisfies IHrmPlatformOrganization.IRequest,
    },
  );
  typia.assert(allResult);
  TestValidator.predicate(
    "empty search returns organizations",
    allResult.data.length > 0,
  );
  // 3. Test sorting by name ascending
  const nameAscResult = await api.functional.hrmPlatform.organizations.index(
    userConnection,
    {
      body: {
        sortBy: "name",
        sortOrder: "asc",
      } satisfies IHrmPlatformOrganization.IRequest,
    },
  );
  typia.assert(nameAscResult);
  // Verify ascending order
  for (let i = 1; i < nameAscResult.data.length; i++) {
    TestValidator.predicate(
      `name ascending order: ${nameAscResult.data[i - 1].name} <= ${nameAscResult.data[i].name}`,
      nameAscResult.data[i - 1].name.localeCompare(
        nameAscResult.data[i].name,
      ) <= 0,
    );
  }
  // 4. Test sorting by name descending
  const nameDescResult = await api.functional.hrmPlatform.organizations.index(
    userConnection,
    {
      body: {
        sortBy: "name",
        sortOrder: "desc",
      } satisfies IHrmPlatformOrganization.IRequest,
    },
  );
  typia.assert(nameDescResult);
  // Verify descending order
  for (let i = 1; i < nameDescResult.data.length; i++) {
    TestValidator.predicate(
      `name descending order: ${nameDescResult.data[i - 1].name} >= ${nameDescResult.data[i].name}`,
      nameDescResult.data[i - 1].name.localeCompare(
        nameDescResult.data[i].name,
      ) >= 0,
    );
  }
  // 5. Test sorting by created_at descending (newest first)
  const createdAtDescResult =
    await api.functional.hrmPlatform.organizations.index(userConnection, {
      body: {
        sortBy: "created_at",
        sortOrder: "desc",
      } satisfies IHrmPlatformOrganization.IRequest,
    });
  typia.assert(createdAtDescResult);
  // Verify descending order by created_at
  for (let i = 1; i < createdAtDescResult.data.length; i++) {
    const prevDate = new Date(
      createdAtDescResult.data[i - 1].created_at,
    ).getTime();
    const currDate = new Date(createdAtDescResult.data[i].created_at).getTime();
    TestValidator.predicate(
      `created_at descending order: ${createdAtDescResult.data[i - 1].created_at} >= ${createdAtDescResult.data[i].created_at}`,
      prevDate >= currDate,
    );
  }
  // 6. Test sorting by updated_at ascending (oldest first)
  const updatedAtAscResult =
    await api.functional.hrmPlatform.organizations.index(userConnection, {
      body: {
        sortBy: "updated_at",
        sortOrder: "asc",
      } satisfies IHrmPlatformOrganization.IRequest,
    });
  typia.assert(updatedAtAscResult);
  // Verify ascending order by updated_at
  for (let i = 1; i < updatedAtAscResult.data.length; i++) {
    const prevDate = new Date(
      updatedAtAscResult.data[i - 1].updated_at,
    ).getTime();
    const currDate = new Date(updatedAtAscResult.data[i].updated_at).getTime();
    TestValidator.predicate(
      `updated_at ascending order: ${updatedAtAscResult.data[i - 1].updated_at} <= ${updatedAtAscResult.data[i].updated_at}`,
      prevDate <= currDate,
    );
  }
  // 7. Test combining search and sort
  const searchAndSortResult =
    await api.functional.hrmPlatform.organizations.index(userConnection, {
      body: {
        search: "acme",
        sortBy: "name",
        sortOrder: "asc",
      } satisfies IHrmPlatformOrganization.IRequest,
    });
  typia.assert(searchAndSortResult);
  // Verify all results contain search term
  await ArrayUtil.asyncForEach(searchAndSortResult.data, async (org) => {
    TestValidator.predicate(
      `search result contains "acme": ${org.name}`,
      org.name.toLowerCase().includes("acme"),
    );
  });
  // Verify results are sorted by name ascending
  for (let i = 1; i < searchAndSortResult.data.length; i++) {
    TestValidator.predicate(
      `combined search+sort ascending: ${searchAndSortResult.data[i - 1].name} <= ${searchAndSortResult.data[i].name}`,
      searchAndSortResult.data[i - 1].name.localeCompare(
        searchAndSortResult.data[i].name,
      ) <= 0,
    );
  }
  // 8. Test pagination with search and sort
  const paginatedResult = await api.functional.hrmPlatform.organizations.index(
    userConnection,
    {
      body: {
        search: undefined,
        page: 1,
        limit: 10,
        sortBy: "created_at",
        sortOrder: "desc",
      } satisfies IHrmPlatformOrganization.IRequest,
    },
  );
  typia.assert(paginatedResult);
  // Verify pagination metadata
  TestValidator.equals(
    "pagination current page",
    paginatedResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    paginatedResult.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination has valid records count",
    paginatedResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has valid pages count",
    paginatedResult.pagination.pages >= 0,
  );
  // Verify data length respects limit
  TestValidator.predicate(
    "data length respects limit",
    paginatedResult.data.length <= 10,
  );
}
