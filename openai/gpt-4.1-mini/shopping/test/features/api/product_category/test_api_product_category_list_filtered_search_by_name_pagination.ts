import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductCategory";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test that an administrator can retrieve product categories filtered by a search keyword in category name or description with pagination parameters.
 * Validate that only matching categories are returned, pagination metadata is accurate, and sorting by name ascending works.
 * Ensure the authorization of the admin is enforced.
 * Test boundary values such as page number and limit within constraints.
 */
export async function test_api_product_category_list_filtered_search_by_name_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator join and obtain authorized connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized: IShoppingMallAdministrator.IAuthorized =
    await authorize_administrator_join(adminConnection, {
      body: {
        email: `admin+${RandomGenerator.alphaNumeric(8)}@test.com`,
        password: "Pa$$w0rd1234",
      },
    });
  adminConnection.headers = {
    Authorization: adminAuthorized.token.access,
  };
  // 2. Prepare some product categories with deterministic values
  // NOTE: We cannot create categories here because there's no utility or SDK api provided for creation.
  // So we will do filtered searches with random or preset keywords assuming some data exists.
  // 3. Test searching with filtered search keyword in name or description
  // Let's craft several search keywords from typical words
  const searchKeywords = ["cat", "elec", "book", "sport"];
  // 4. Test pagination boundaries
  const pageNumbers = [1, 2];
  const limits = [1, 3];
  // 5. For each keyword, page and limit, perform a search then validate
  for (const keyword of searchKeywords) {
    for (const page of pageNumbers) {
      for (const limit of limits) {
        const body: IShoppingMallProductCategory.IRequest = {
          search: keyword,
          page: page as number &
            typia.tags.Type<"int32"> &
            typia.tags.Minimum<1>,
          limit: limit as number &
            typia.tags.Type<"int32"> &
            typia.tags.Minimum<1> &
            typia.tags.Maximum<100>,
          sortBy: "name",
          sortOrder: "asc",
        };
        // Call API
        const result: IPageIShoppingMallProductCategory.ISummary =
          await api.functional.shoppingMall.administrator.productCategories.index(
            adminConnection,
            { body },
          );
        typia.assert(result);
        // Validate pagination constraints
        TestValidator.predicate(
          `page number >=1`,
          result.pagination.current >= 1,
        );
        TestValidator.predicate(
          `limit between 1 and 100`,
          result.pagination.limit >= 1 && result.pagination.limit <= 100,
        );
        // Validate total pages is correct
        const expectedPages =
          result.pagination.limit === 0
            ? 0
            : Math.ceil(result.pagination.records / result.pagination.limit);
        TestValidator.equals(
          `pages count matches calculation for keyword '${keyword}' page ${page} limit ${limit}`,
          result.pagination.pages,
          expectedPages,
        );
        // Validate search results are filtered properly
        const allMatchKeyword = result.data.every(
          (cat) =>
            cat.name.includes(keyword) || cat.description.includes(keyword),
        );
        TestValidator.predicate(
          `all categories match search keyword '${keyword}'`,
          allMatchKeyword,
        );
        // Validate sorting ascending by name
        for (let i = 1; i < result.data.length; i++) {
          TestValidator.predicate(
            `name ascending order for keyword '${keyword}' page ${page} limit ${limit}`,
            result.data[i - 1].name.localeCompare(result.data[i].name) <= 0,
          );
        }
      }
    }
  }
  // 6. Test authorization enforcement - no token or invalid token
  {
    // New connection without authorization
    const invalidConnection: api.IConnection = { host: connection.host };
    const invalidBody: IShoppingMallProductCategory.IRequest = {
      search: "test",
      page: 1 as number & typia.tags.Type<"int32"> & typia.tags.Minimum<1>,
      limit: 10 as number &
        typia.tags.Type<"int32"> &
        typia.tags.Minimum<1> &
        typia.tags.Maximum<100>,
      sortBy: "name",
      sortOrder: "asc",
    };
    await TestValidator.httpError(
      "request without auth should fail",
      401,
      async () => {
        await api.functional.shoppingMall.administrator.productCategories.index(
          invalidConnection,
          { body: invalidBody },
        );
      },
    );
  }
}
