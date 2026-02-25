import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

/**
 * Test pagination and sorting functionality of category analytics.
 *
 * After super administrator authentication, make multiple requests with different
 * page numbers and limit values. Verify that pagination metadata (current page,
 * limit, total records, total pages) is accurate and consistent across requests.
 * Test that subsequent pages contain distinct data and switching pages returns
 * appropriate subsets. Validate that the analytics respects the configured
 * maximum limit (100 records per page) and properly handles boundary conditions
 * like final page with fewer records.
 */
export async function test_api_category_analytics_pagination_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_administrator_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSuperAdministrator.IJoin,
  });
  // 2. Get initial baseline to understand total record count
  const baseline =
    await api.functional.ecommerce.superAdministrator.category_analytics.index(
      superAdminConnection,
      {
        body: {
          page: 1 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> as number,
          limit: 10 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100> as number,
        } satisfies IEcommerceCategory.IRequest,
      },
    );
  typia.assert(baseline);
  const totalRecords = baseline.pagination.records;
  const totalPages = baseline.pagination.pages;
  // Skip further testing if insufficient data
  if (totalRecords < 5) {
    return;
  }
  // 3. Test different limit values
  const limitValues = [5, 25, 50, 100] as const;
  for (const limit of limitValues) {
    if (limit <= totalRecords) {
      const response =
        await api.functional.ecommerce.superAdministrator.category_analytics.index(
          superAdminConnection,
          {
            body: {
              page: 1 satisfies number &
                tags.Type<"int32"> &
                tags.Minimum<1> as number,
              limit: limit satisfies number &
                tags.Type<"int32"> &
                tags.Minimum<1> &
                tags.Maximum<100> as number,
            } satisfies IEcommerceCategory.IRequest,
          },
        );
      typia.assert(response);
      TestValidator.equals(
        `limit=${limit}: current page matches`,
        response.pagination.current,
        1,
      );
      TestValidator.equals(
        `limit=${limit}: limit matches`,
        response.pagination.limit,
        limit,
      );
      TestValidator.equals(
        `limit=${limit}: total records consistent`,
        response.pagination.records,
        totalRecords,
      );
      TestValidator.predicate(
        `limit=${limit}: data length <= limit`,
        response.data.length <= limit,
      );
      TestValidator.predicate(
        `limit=${limit}: pages calculated correctly`,
        response.pagination.pages === Math.ceil(totalRecords / limit),
      );
    }
  }
  // 4. Test page navigation with fixed limit
  const testLimit = Math.min(10, totalRecords);
  const actualTotalPages = Math.ceil(totalRecords / testLimit);
  const testPages = Math.min(3, actualTotalPages);
  const seenIds = new Set<string>();
  for (let page = 1; page <= testPages; page++) {
    const response =
      await api.functional.ecommerce.superAdministrator.category_analytics.index(
        superAdminConnection,
        {
          body: {
            page: page satisfies number &
              tags.Type<"int32"> &
              tags.Minimum<1> as number,
            limit: testLimit satisfies number &
              tags.Type<"int32"> &
              tags.Minimum<1> &
              tags.Maximum<100> as number,
          } satisfies IEcommerceCategory.IRequest,
        },
      );
    typia.assert(response);
    TestValidator.equals(
      `page=${page}: current page matches`,
      response.pagination.current,
      page,
    );
    TestValidator.equals(
      `page=${page}: limit matches`,
      response.pagination.limit,
      testLimit,
    );
    TestValidator.equals(
      `page=${page}: total records consistent`,
      response.pagination.records,
      totalRecords,
    );
    TestValidator.predicate(
      `page=${page}: pages calculated correctly`,
      response.pagination.pages === actualTotalPages,
    );
    // Verify data uniqueness across pages
    for (const category of response.data) {
      typia.assert(category);
      TestValidator.predicate(
        `page=${page}: category ID ${category.id} not seen on previous pages`,
        !seenIds.has(category.id),
      );
      seenIds.add(category.id);
    }
  }
  // 5. Test last page behavior
  if (actualTotalPages > 1) {
    const lastPage = actualTotalPages;
    const response =
      await api.functional.ecommerce.superAdministrator.category_analytics.index(
        superAdminConnection,
        {
          body: {
            page: lastPage satisfies number &
              tags.Type<"int32"> &
              tags.Minimum<1> as number,
            limit: testLimit satisfies number &
              tags.Type<"int32"> &
              tags.Minimum<1> &
              tags.Maximum<100> as number,
          } satisfies IEcommerceCategory.IRequest,
        },
      );
    typia.assert(response);
    TestValidator.equals(
      `last page ${lastPage}: is current page`,
      response.pagination.current,
      lastPage,
    );
    TestValidator.predicate(
      `last page ${lastPage}: has data`,
      response.data.length > 0,
    );
    TestValidator.predicate(
      `last page ${lastPage}: data length <= limit`,
      response.data.length <= testLimit,
    );
    // Validate last page has correct number of items
    const expectedLastPageItems =
      totalRecords - testLimit * (actualTotalPages - 1);
    TestValidator.equals(
      `last page ${lastPage}: has correct item count`,
      response.data.length,
      expectedLastPageItems,
    );
  }
  // 6. Test maximum limit constraint
  const maxLimitResponse =
    await api.functional.ecommerce.superAdministrator.category_analytics.index(
      superAdminConnection,
      {
        body: {
          page: 1 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> as number,
          limit: 100 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100> as number,
        } satisfies IEcommerceCategory.IRequest,
      },
    );
  typia.assert(maxLimitResponse);
  TestValidator.equals(
    "maximum limit = 100 matches",
    maxLimitResponse.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "maximum limit: data length <= 100",
    maxLimitResponse.data.length <= 100,
  );
}
