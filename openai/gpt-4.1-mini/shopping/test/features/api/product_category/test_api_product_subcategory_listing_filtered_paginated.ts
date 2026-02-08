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

export async function test_api_product_subcategory_listing_filtered_paginated(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: typia.random<IShoppingMallAdministrator.IJoin>(),
  });
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = `Bearer ${adminAuth.token.access}`;
  // Create a new product category as prerequisite
  await generate_random_shopping_mall_administrator_product_categories_create(
    adminConnection,
    {},
  );
  // Generate a random UUID string for categoryId parameter
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  // Prepare request bodies with various filter criteria and pagination
  const filterBody = typia.random<IShoppingMallProductSubcategory.IRequest>();
  // Call the index endpoint with composed body
  const response =
    await api.functional.shoppingMall.administrator.product.categories.subcategories.index(
      adminConnection,
      {
        categoryId: categoryId,
        body: filterBody,
      },
    );
  // Validate the response
  typia.assert(response);
  // Validate pagination fields
  TestValidator.predicate(
    "pagination current is >= 0",
    response.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is >= 0",
    response.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination pages is >= 0",
    response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records is >= 0",
    response.pagination.records >= 0,
  );
  // Check all returned data items have correct subcategory summary shape
  response.data.forEach((subcat) => {
    typia.assert(subcat);
    const safeSubcat = typia.assert<{
      id: string;
      name: string;
    }>(subcat);
    TestValidator.predicate(
      "subcategory has valid id format",
      /^[0-9a-fA-F-]{36}$/.test(safeSubcat.id),
    );
    TestValidator.predicate(
      "subcategory name non-empty",
      safeSubcat.name.length > 0,
    );
  });
  // Test authorization enforcement
  const noAuthConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("unauthorized access throws", async () => {
    await api.functional.shoppingMall.administrator.product.categories.subcategories.index(
      noAuthConnection,
      {
        categoryId: categoryId,
        body: filterBody,
      },
    );
  });
}
