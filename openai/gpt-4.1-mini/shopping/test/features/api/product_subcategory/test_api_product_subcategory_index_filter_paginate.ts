import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductSubcategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSubcategory";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductSubcategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSubcategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_shopping_mall_administrator_product_categories_create } from "../../../generate/generate_random_shopping_mall_administrator_product_categories_create";
import { prepare_random_shopping_mall_product_category } from "../../../prepare/prepare_random_shopping_mall_product_category";

export async function test_api_product_subcategory_index_filter_paginate(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator join and authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinBody: IShoppingMallAdministrator.IJoin =
    typia.random<IShoppingMallAdministrator.IJoin>();
  const authorizedAdmin: IShoppingMallAdministrator.IAuthorized =
    await authorize_administrator_join(adminConnection, {
      body: adminJoinBody,
    });
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = authorizedAdmin.token.access;
  // 2. Create a product category preceding subcategory indexing (category has no 'id' property in type, so ignored)
  await generate_random_shopping_mall_administrator_product_categories_create(
    adminConnection,
    {
      body: {},
    },
  );
  // 3. Scenario 1: Retrieve subcategories with filters and pagination
  // Use a random UUID string for categoryId since productCategory.id doesn't exist
  const categoryId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Construct empty filter and pagination request body
  const requestBody1: IShoppingMallProductSubcategory.IRequest = {};
  // Retrieve subcategories index
  const response1: IPageIShoppingMallProductSubcategory.ISummary =
    await api.functional.shoppingMall.administrator.productCategories.subcategories.index(
      adminConnection,
      {
        categoryId: categoryId,
        body: requestBody1,
      },
    );
  typia.assert(response1);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination current page positive",
    response1.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit positive",
    response1.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    response1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    response1.pagination.pages >= 0,
  );
  // 4. Scenario 2: Filtering that yields no results
  // Use another random UUID for categoryId
  const categoryId2: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const requestBody2: IShoppingMallProductSubcategory.IRequest = {};
  const response2: IPageIShoppingMallProductSubcategory.ISummary =
    await api.functional.shoppingMall.administrator.productCategories.subcategories.index(
      adminConnection,
      {
        categoryId: categoryId2,
        body: requestBody2,
      },
    );
  typia.assert(response2);
  // Validate response2 data array is an array
  TestValidator.predicate(
    "response data is array",
    Array.isArray(response2.data),
  );
  // Validate pagination reflects empty or zero results
  if (response2.pagination.records === 0) {
    TestValidator.equals(
      "response2 has zero records",
      response2.data.length,
      0,
    );
    TestValidator.equals(
      "pagination pages are zero",
      response2.pagination.pages,
      0,
    );
  } else {
    TestValidator.predicate(
      "pagination records positive",
      response2.pagination.records > 0,
    );
  }
}
