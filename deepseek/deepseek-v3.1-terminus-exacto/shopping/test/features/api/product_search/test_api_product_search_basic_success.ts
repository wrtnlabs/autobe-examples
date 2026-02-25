import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceProduct";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_ecommerce_administrator_categories_create } from "../../../generate/generate_random_ecommerce_administrator_categories_create";
import { prepare_random_ecommerce_category } from "../../../prepare/prepare_random_ecommerce_category";

/**
 * Test basic product search functionality with minimal filtering.
 * 1. Administrator joins for authorization context
 * 2. Perform basic product search without any filters
 * 3. Validate pagination metadata and default behavior
 * 4. Verify product structure and essential fields
 * 5. Test sorting by newest products
 */
export async function test_api_product_search_basic_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup for authentication context
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin123",
    } satisfies IEcommerceAdministrator.IJoin,
  });
  typia.assert(admin);
  // 2. Perform basic product search without filters
  const searchResult = await api.functional.ecommerce.products.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        sort_by: "newest",
      } satisfies IEcommerceProduct.IRequest,
    },
  );
  typia.assert(searchResult);
  // 3. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    searchResult.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", searchResult.pagination.limit, 10);
  TestValidator.predicate(
    "pagination records non-negative",
    searchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    searchResult.pagination.pages >= 0,
  );
  // 4. Validate pagination calculation consistency
  if (searchResult.pagination.records > 0) {
    const calculatedPages = Math.ceil(
      searchResult.pagination.records / searchResult.pagination.limit,
    );
    TestValidator.equals(
      "pagination pages calculation",
      searchResult.pagination.pages,
      calculatedPages,
    );
  }
  // 5. Validate product structure in search results
  if (searchResult.data.length > 0) {
    const product = searchResult.data[0];
    // Validate required product fields
    TestValidator.predicate(
      "product has id",
      typeof product.id === "string" && product.id.length > 0,
    );
    TestValidator.predicate(
      "product has name",
      typeof product.name === "string" && product.name.length > 0,
    );
    TestValidator.predicate(
      "product has valid base_price",
      typeof product.base_price === "number" && product.base_price >= 0,
    );
    // Validate seller information
    TestValidator.predicate("product has seller", product.seller !== undefined);
    TestValidator.predicate(
      "seller has id",
      typeof product.seller?.id === "string" && product.seller.id.length > 0,
    );
    TestValidator.predicate(
      "seller has email",
      typeof product.seller?.email === "string" &&
        product.seller.email.length > 0,
    );
    TestValidator.predicate(
      "seller has shop_name",
      typeof product.seller?.shop_name === "string" &&
        product.seller.shop_name.length > 0,
    );
    // Validate category information
    TestValidator.predicate(
      "product has category",
      product.category !== undefined,
    );
    TestValidator.predicate(
      "category has id",
      typeof product.category?.id === "string" &&
        product.category.id.length > 0,
    );
    TestValidator.predicate(
      "category has name",
      typeof product.category?.name === "string" &&
        product.category.name.length > 0,
    );
  }
  // 6. Test that data array length matches pagination expectations
  if (searchResult.pagination.records === 0) {
    TestValidator.equals(
      "empty records should have empty data",
      searchResult.data.length,
      0,
    );
  } else {
    TestValidator.predicate(
      "data length should be <= limit",
      searchResult.data.length <= searchResult.pagination.limit,
    );
  }
}
