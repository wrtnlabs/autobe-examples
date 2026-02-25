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

export async function test_api_product_category_list_empty_result_no_match(
  connection: api.IConnection,
): Promise<void> {
  // Administrator authorization setup
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {
      email:
        "test-admin-" +
        Math.random().toString(36).substring(2, 12) +
        "@test.com",
      password: "testpassword",
    },
  });
  adminConnection.headers = {
    Authorization: adminAuthorized.token.access,
  };
  // Compose a search request that cannot match any category by using a
  // random unlikely search string
  const body = {
    search: Math.random().toString(36).substring(2, 32) + "_nomatch_",
    page: 1,
    limit: 10,
    sortBy: "name",
    sortOrder: "asc",
  } satisfies IShoppingMallProductCategory.IRequest;
  // Call the index endpoint with admin connection and request body
  const response =
    await api.functional.shoppingMall.administrator.productCategories.index(
      adminConnection,
      { body },
    );
  typia.assert(response);
  // Validate pagination metadata indicates zero records and zero pages
  TestValidator.equals("empty result records", response.pagination.records, 0);
  TestValidator.equals("empty result pages", response.pagination.pages, 0);
  TestValidator.equals("empty result data length", response.data.length, 0);
}
