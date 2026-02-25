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

export async function test_api_product_category_search_filter_no_results(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Validating product category search and filtering with no result scenarios and access control.
  // 1. Administrator authorization to access product category search
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinBody: IShoppingMallAdministrator.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "password123",
  };
  const admin = await authorize_administrator_join(adminConnection, {
    body: adminJoinBody,
  });
  typia.assert(admin);
  // 2. Test filtering by non-existent parentCategoryId
  {
    const nonExistentParentId = typia.random<string & tags.Format<"uuid">>();
    const requestBody: IShoppingMallProductCategory.IRequest = {
      parentCategoryId: nonExistentParentId,
      page: 1,
      limit: 10,
    };
    const response =
      await api.functional.shoppingMall.administrator.product_categories.index(
        adminConnection,
        {
          body: requestBody,
        },
      );
    typia.assert(response);
    // Expect empty result array
    TestValidator.equals(
      "empty data array for non-existent parentCategoryId",
      response.data,
      [],
    );
    // Pagination information for empty results
    TestValidator.equals(
      "pagination current page",
      response.pagination.current,
      1,
    );
    TestValidator.equals("pagination limit", response.pagination.limit, 10);
    TestValidator.equals(
      "pagination total records",
      response.pagination.records,
      0,
    );
    TestValidator.equals(
      "pagination total pages",
      response.pagination.pages,
      0,
    );
  }
  // 3. Test search with no matching keyword
  {
    const requestBody: IShoppingMallProductCategory.IRequest = {
      search: "nonexistentkeywordxyz",
      page: 1,
      limit: 10,
    };
    const response =
      await api.functional.shoppingMall.administrator.product_categories.index(
        adminConnection,
        {
          body: requestBody,
        },
      );
    typia.assert(response);
    // Expect empty data array
    TestValidator.equals(
      "empty data array for unmatched search keyword",
      response.data,
      [],
    );
    TestValidator.equals(
      "pagination current page",
      response.pagination.current,
      1,
    );
    TestValidator.equals("pagination limit", response.pagination.limit, 10);
    TestValidator.equals(
      "pagination total records",
      response.pagination.records,
      0,
    );
    TestValidator.equals(
      "pagination total pages",
      response.pagination.pages,
      0,
    );
  }
  // 4. Authorization required verification: Unauthenticated request should be rejected
  {
    const unauthConnection: api.IConnection = { host: connection.host };
    const requestBody: IShoppingMallProductCategory.IRequest = {
      page: 1,
      limit: 10,
    };
    await TestValidator.httpError(
      "unauthorized access should fail",
      401,
      async () => {
        await api.functional.shoppingMall.administrator.product_categories.index(
          unauthConnection,
          { body: requestBody },
        );
      },
    );
  }
  // 5. Authorization required verification: Non-admin user should be rejected
  {
    // Simulating non-admin by not authorizing as admin
    const userConnection: api.IConnection = { host: connection.host };
    const requestBody: IShoppingMallProductCategory.IRequest = {
      page: 1,
      limit: 10,
    };
    await TestValidator.httpError(
      "non-admin user access should fail",
      403,
      async () => {
        await api.functional.shoppingMall.administrator.product_categories.index(
          userConnection,
          { body: requestBody },
        );
      },
    );
  }
}
