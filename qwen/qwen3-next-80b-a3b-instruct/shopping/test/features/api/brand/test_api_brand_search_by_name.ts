import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductBrand";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallProductBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductBrand";
import { prepare_random_shopping_mall_product_brand } from "../../../prepare/prepare_random_shopping_mall_product_brand";
import { generate_random_shopping_mall_admin_brands_create } from "../../../generate/generate_random_shopping_mall_admin_brands_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_brand_search_by_name(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as admin to access brand search functionality
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: `https://example.com/admin/join-${RandomGenerator.alphaNumeric(6)}`,
      referrer: `https://example.com/admin/signup-${RandomGenerator.alphaNumeric(6)}`,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(admin);
  // Step 2: Create multiple test brands with varying names to establish searchable dataset
  // We need at least one brand with the search term "son" and others to test pagination and sorting
  // Create 21 brands to ensure pagination and search coverage
  const searchTerm = "son";
  const createdBrands: IShoppingMallProductBrand[] = [];
  // Create brands with names containing search term
  const brandWithSearchTerm =
    await generate_random_shopping_mall_admin_brands_create(adminConnection, {
      body: {
        name: "Sony",
      } satisfies IShoppingMallProductBrand.ICreate,
    });
  typia.assert(brandWithSearchTerm);
  createdBrands.push(brandWithSearchTerm);
  // Create additional brands with names containing "son" to ensure multiple matches
  const brandWithSearchTerm2 =
    await generate_random_shopping_mall_admin_brands_create(adminConnection, {
      body: {
        name: "Samsung",
      } satisfies IShoppingMallProductBrand.ICreate,
    });
  typia.assert(brandWithSearchTerm2);
  createdBrands.push(brandWithSearchTerm2);
  // Create additional brands without the search term to ensure search is filtered correctly
  for (let i = 0; i < 19; i++) {
    const brandName = RandomGenerator.name(
      RandomGenerator.pick([1, 2]) as number,
    );
    const brand = await generate_random_shopping_mall_admin_brands_create(
      adminConnection,
      {
        body: {
          name: brandName,
        } satisfies IShoppingMallProductBrand.ICreate,
      },
    );
    typia.assert(brand);
    createdBrands.push(brand);
  }
  // Step 3: Search for brands using partial name match ("son") that should return Sony, Samsung, and others
  const searchResults = await api.functional.shoppingMall.brands.index(
    adminConnection,
    {
      body: {
        name: searchTerm,
      } satisfies IShoppingMallProductBrand.IRequest,
    },
  );
  typia.assert(searchResults);
  // Step 4: Validate search results structure and pagination
  TestValidator.equals(
    "pagination object exists",
    typeof searchResults.pagination,
    "object",
  );
  TestValidator.equals(
    "pagination current page is 1",
    searchResults.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 20 (default)",
    searchResults.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination pages is at least 1",
    searchResults.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "pagination records is at least 2",
    searchResults.pagination.records >= 2,
  ); // At least Sony and Samsung
  // Step 5: Validate that search results contain expected brands with correct structure
  TestValidator.predicate(
    "search results have data array",
    Array.isArray(searchResults.data),
  );
  TestValidator.predicate(
    "search results have at least 2 items",
    searchResults.data.length >= 2,
  );
  // Validate that returned brands have correct summary structure
  for (const brand of searchResults.data) {
    TestValidator.equals("brand has id property", typeof brand.id, "string");
    TestValidator.predicate(
      "brand id is UUID format",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
        brand.id,
      ),
    );
    TestValidator.equals(
      "brand has name property",
      typeof brand.name,
      "string",
    );
    TestValidator.equals(
      "brand has status property",
      typeof brand.status,
      "string",
    );
    TestValidator.equals(
      "brand status is one of allowed values",
      ["active", "inactive", "pending_approval"].includes(brand.status),
      true,
    );
    TestValidator.equals(
      "brand has created_at property",
      typeof brand.created_at,
      "string",
    );
    TestValidator.predicate(
      "brand created_at is ISO date-time format",
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]{3})?Z$/.test(
        brand.created_at,
      ),
    );
    TestValidator.equals(
      "brand has updated_at property",
      typeof brand.updated_at,
      "string",
    );
    TestValidator.predicate(
      "brand updated_at is ISO date-time format",
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]{3})?Z$/.test(
        brand.updated_at,
      ),
    );
    TestValidator.equals(
      "brand has product_count property",
      typeof brand.product_count,
      "number",
    );
    TestValidator.predicate(
      "brand product_count is non-negative",
      brand.product_count >= 0,
    );
    TestValidator.equals(
      "brand has is_verified property",
      typeof brand.is_verified,
      "boolean",
    );
    // Validate that name matches the search term - case-insensitive
    TestValidator.equals(
      "brand name contains search term 'son'",
      brand.name.toLowerCase().includes(searchTerm),
      true,
    );
  }
  // Step 6: Verify results are sorted by name in ascending order
  // Sort the search results by name ascending
  const sortedByNames = [...searchResults.data].sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  TestValidator.equals(
    "results are sorted by name in ascending order",
    searchResults.data.map((b) => b.name).join(","),
    sortedByNames.map((b) => b.name).join(","),
  );
}
