import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductCategory";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_product_category_index_basic_listing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator join and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  // 2. Call product category index endpoint without any filters (empty object)
  const response =
    await api.functional.shoppingMall.administrator.productCategories.index(
      adminConnection,
      {
        body: {}, // empty filters and pagination
      },
    );
  // 3. Assert response type
  typia.assert(response);
  // 4. Validate pagination properties
  TestValidator.predicate(
    "pagination current page is at least 1",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    response.pagination.pages >= 0,
  );
  // Pages should be approximation of records / limit (ceil)
  const expectedPages = Math.ceil(
    response.pagination.records / response.pagination.limit,
  );
  TestValidator.equals(
    "pagination pages is correct",
    response.pagination.pages,
    expectedPages,
  );
  // 5. Validate that data array respects pagination limit
  TestValidator.predicate(
    "data array is array and respects pagination limit",
    Array.isArray(response.data) &&
      response.data.length <= response.pagination.limit,
  );
}
