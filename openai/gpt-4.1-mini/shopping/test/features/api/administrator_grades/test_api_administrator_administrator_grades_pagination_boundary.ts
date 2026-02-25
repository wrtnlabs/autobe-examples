import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdministratorGrade";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_administrator_grades_pagination_boundary(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Test listing administrator grades pagination boundary conditions
  // Authenticate as administrator first by joining.
  // 1. Administrator joins and obtains authorized connection
  const adminConnection: api.IConnection = { host: connection.host };
  const inserted = await authorize_administrator_join(adminConnection, {
    body: undefined,
  });
  typia.assert(inserted);
  // 2. Pagination test with limit=1 to get one record per page
  const limit = 1 as const;
  // For pagination logic, first get the first page to determine total pages
  const firstPage =
    await api.functional.shoppingMall.administrator.administratorGrades.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: limit,
        },
      },
    );
  typia.assert(firstPage);
  const pagination = firstPage.pagination;
  // Validate pagination metadata consistency
  TestValidator.predicate(
    "pagination current page is 1",
    pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit matches requested",
    pagination.limit === limit,
  );
  TestValidator.predicate(
    "pagination pages greater or equal to 0",
    pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records greater or equal to 0",
    pagination.records >= 0,
  );
  // If there are no pages, verify data is empty
  if (pagination.pages === 0) {
    TestValidator.equals("no data on first page", firstPage.data.length, 0);
    return;
  }
  // To store all fetched records to check duplication across pages
  const fetchedGrades: IShoppingMallAdministratorGrade.ISummary[] = [];
  // Fetch all pages using limit=1 from 1 to pages
  for (let page = 1; page <= pagination.pages; ++page) {
    const pageData =
      await api.functional.shoppingMall.administrator.administratorGrades.index(
        adminConnection,
        {
          body: {
            page: page,
            limit: limit,
          },
        },
      );
    typia.assert(pageData);
    // Validate current page matches
    TestValidator.equals(
      `pagination on page ${page}`,
      pageData.pagination.current,
      page,
    );
    // Validate page data length <= limit
    TestValidator.predicate(
      `page ${page} data length <= limit`,
      pageData.data.length <= limit,
    );
    // Check no duplication
    for (const item of pageData.data) {
      TestValidator.notEquals(
        "no duplication on pages",
        fetchedGrades.findIndex((v) => v.id === item.id),
        -1,
      );
    }
    fetchedGrades.push(...pageData.data);
    // Validate ordering: ascending grade order
    if (fetchedGrades.length > 1) {
      for (let i = 1; i < fetchedGrades.length; ++i) {
        TestValidator.predicate(
          "ascending grade order",
          fetchedGrades[i - 1].grade <= fetchedGrades[i].grade,
        );
      }
    }
  }
  // Check total records matches fetched count
  TestValidator.equals(
    "total records matches fetched count",
    pagination.records,
    fetchedGrades.length,
  );
  // Edge case: request page out of range (e.g. pages + 1)
  const outOfRangePage = pagination.pages + 1;
  const outOfRange =
    await api.functional.shoppingMall.administrator.administratorGrades.index(
      adminConnection,
      {
        body: {
          page: outOfRangePage,
          limit: limit,
        },
      },
    );
  typia.assert(outOfRange);
  TestValidator.equals(
    "page out of range returns empty data",
    outOfRange.data.length,
    0,
  );
  TestValidator.equals(
    "page out of range current matches requested",
    outOfRange.pagination.current,
    outOfRangePage,
  );
  // Edge case: request page 0 returns first page or empty depending on API behavior
  const zeroPage = 0;
  const zeroPageResult =
    await api.functional.shoppingMall.administrator.administratorGrades.index(
      adminConnection,
      {
        body: {
          page: zeroPage,
          limit: limit,
        },
      },
    );
  typia.assert(zeroPageResult);
  TestValidator.predicate(
    "page zero handled as boundary",
    zeroPageResult.pagination.current === 1 ||
      zeroPageResult.pagination.current === 0,
  );
}
