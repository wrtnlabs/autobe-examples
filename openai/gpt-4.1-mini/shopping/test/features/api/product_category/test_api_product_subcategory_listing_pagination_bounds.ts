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

export async function test_api_product_subcategory_listing_pagination_bounds(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator join and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: typia.random<IShoppingMallAdministrator.IJoin>(),
  });
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = `Bearer ${adminAuth.token.access}`;
  // 2. Create a new product category to use
  const category =
    await generate_random_shopping_mall_administrator_product_categories_create(
      adminConnection,
      {
        body: {},
      },
    );
  typia.assert(category);
  // 3. List subcategories with out of bound page number
  // Construct a request with large page number expecting empty results
  const largePageNumber = 9999;
  const perPageLimit = 10;
  // Typia random for IRequest may give invalid or unexpected properties
  // We use minimal valid request body with pagination properties to test bounds
  const requestBody = {
    page: largePageNumber as number & tags.Type<"int32">,
    limit: perPageLimit as number & tags.Type<"int32">,
  } satisfies IShoppingMallProductSubcategory.IRequest;
  const response =
    await api.functional.shoppingMall.administrator.product.categories.subcategories.index(
      adminConnection,
      {
        categoryId: category as unknown as string,
        body: requestBody,
      },
    );
  typia.assert(response);
  // 4. Validate pagination metadata
  // Expect current page to be at most total pages or 1 if no data
  const totalPages = response.pagination.pages;
  const currentPage = response.pagination.current;
  // If pages is 0 means no records, current must be 1 by API's common pagination behavior
  if (totalPages === 0) {
    TestValidator.equals("pagination current page", currentPage, 1);
    TestValidator.equals("empty data length", response.data.length, 0);
  } else {
    // Validate current page does not exceed total pages
    TestValidator.predicate(
      `current page (${currentPage}) <= total pages (${totalPages})`,
      currentPage <= totalPages,
    );
    // As we requested page number far beyond last page, current page must be adjusted lower or equal total pages
    TestValidator.predicate(
      "subcategories data length is zero when requesting page beyond total pages",
      response.data.length === 0,
    );
  }
}
