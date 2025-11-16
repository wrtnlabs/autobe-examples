import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformConfiguration";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformConfiguration";

/**
 * Test pagination with different page size limits.
 *
 * Administrator creates account and retrieves configurations with various limit
 * values (1, 5, 20, 50, 100). Validates that each request returns the correct
 * number of items (or fewer on the last page) and that pagination metadata
 * accurately reflects the requested limit. Confirms that the total records and
 * total pages calculations adjust correctly based on the limit. Tests boundary
 * conditions at limit=1 (each item on separate page) and limit=100 (maximum
 * allowed).
 *
 * Steps:
 *
 * 1. Create administrator account
 * 2. Test pagination with limit=1 (boundary condition)
 * 3. Test pagination with limit=5
 * 4. Test pagination with limit=20 (default-like size)
 * 5. Test pagination with limit=50
 * 6. Test pagination with limit=100 (maximum allowed)
 * 7. Validate pagination metadata calculations for each limit
 */
export async function test_api_platform_configuration_pagination_limit_variation(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphabets(12),
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: "http://localhost:3000/admin",
        referrer: "http://localhost:3000",
        ip: "127.0.0.1",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Test pagination with various limit values
  const limitValues = [1, 5, 20, 50, 100] as const;

  for (const limit of limitValues) {
    // Step 2-6: Test each limit value by fetching the first page
    const firstPageResult: IPageICommunityPlatformConfiguration.ISummary =
      await api.functional.communityPlatform.administrator.configurations.index(
        connection,
        {
          body: {
            page: 1,
            limit: limit,
          } satisfies ICommunityPlatformConfiguration.IRequest,
        },
      );
    typia.assert(firstPageResult);

    // Validate pagination metadata for first page
    TestValidator.equals(
      `first page number should be 1 for limit ${limit}`,
      firstPageResult.pagination.current,
      1,
    );
    TestValidator.equals(
      `limit should be ${limit}`,
      firstPageResult.pagination.limit,
      limit,
    );

    // Validate that returned items count does not exceed limit
    TestValidator.predicate(
      `items count should not exceed limit ${limit}`,
      firstPageResult.data.length <= limit,
    );

    // Validate total pages calculation
    const expectedPages = Math.ceil(
      firstPageResult.pagination.records / limit,
    ) satisfies number as number;
    TestValidator.equals(
      `total pages should be calculated correctly for limit ${limit}`,
      firstPageResult.pagination.pages,
      expectedPages,
    );

    // Validate items on first page
    const expectedFirstPageItems = Math.min(
      limit,
      firstPageResult.pagination.records,
    );
    TestValidator.equals(
      `first page items should match expected count for limit ${limit}`,
      firstPageResult.data.length,
      expectedFirstPageItems,
    );

    // If there are multiple pages, test the last page to validate pagination across the dataset
    if (firstPageResult.pagination.pages > 1) {
      const lastPageNumber = firstPageResult.pagination.pages;
      const lastPageResult: IPageICommunityPlatformConfiguration.ISummary =
        await api.functional.communityPlatform.administrator.configurations.index(
          connection,
          {
            body: {
              page: lastPageNumber,
              limit: limit,
            } satisfies ICommunityPlatformConfiguration.IRequest,
          },
        );
      typia.assert(lastPageResult);

      // Validate last page metadata
      TestValidator.equals(
        `last page number should be ${lastPageNumber} for limit ${limit}`,
        lastPageResult.pagination.current,
        lastPageNumber,
      );
      TestValidator.equals(
        `limit should remain ${limit} on last page`,
        lastPageResult.pagination.limit,
        limit,
      );

      // Total records and pages should be consistent
      TestValidator.equals(
        `total records should be consistent on last page for limit ${limit}`,
        lastPageResult.pagination.records,
        firstPageResult.pagination.records,
      );
      TestValidator.equals(
        `total pages should be consistent on last page for limit ${limit}`,
        lastPageResult.pagination.pages,
        firstPageResult.pagination.pages,
      );

      // Last page items count should match expected count
      const expectedLastPageItems =
        firstPageResult.pagination.records % limit || limit;
      TestValidator.equals(
        `last page items count should match expected count for limit ${limit}`,
        lastPageResult.data.length,
        expectedLastPageItems,
      );
    } else {
      // If only one page exists, all items should fit in one page
      TestValidator.equals(
        `total pages should be 1 when all items fit for limit ${limit}`,
        firstPageResult.pagination.pages,
        1,
      );
      TestValidator.equals(
        `items count on single page should equal total records for limit ${limit}`,
        firstPageResult.data.length,
        firstPageResult.pagination.records,
      );
    }
  }

  // Validate boundary condition: limit=1 creates separate pages for each item
  const limit1Result: IPageICommunityPlatformConfiguration.ISummary =
    await api.functional.communityPlatform.administrator.configurations.index(
      connection,
      {
        body: {
          page: 1,
          limit: 1,
        } satisfies ICommunityPlatformConfiguration.IRequest,
      },
    );
  typia.assert(limit1Result);

  // With limit=1, total pages should equal total records
  TestValidator.equals(
    "with limit=1, total pages should equal total records",
    limit1Result.pagination.pages,
    limit1Result.pagination.records,
  );

  // Each page should have exactly 1 item
  TestValidator.equals(
    "with limit=1, each page should have exactly 1 item",
    limit1Result.data.length,
    1,
  );

  // Validate boundary condition: limit=100 (maximum allowed)
  const limit100Result: IPageICommunityPlatformConfiguration.ISummary =
    await api.functional.communityPlatform.administrator.configurations.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies ICommunityPlatformConfiguration.IRequest,
      },
    );
  typia.assert(limit100Result);

  // All items should fit in one page if total records <= 100
  if (limit100Result.pagination.records <= 100) {
    TestValidator.equals(
      "with limit=100 and records<=100, should have only 1 page",
      limit100Result.pagination.pages,
      1,
    );
    TestValidator.equals(
      "with limit=100 and records<=100, items should equal total records",
      limit100Result.data.length,
      limit100Result.pagination.records,
    );
  } else {
    // If there are more than 100 records, ensure multiple pages are created
    TestValidator.predicate(
      "with limit=100 and records>100, should have multiple pages",
      limit100Result.pagination.pages > 1,
    );
  }
}
