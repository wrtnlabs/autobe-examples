import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import type { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import type { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
import type { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformProductVariant";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test searching product variants by SKU code for a specific product returns correct paginated results with case-insensitive partial matching.
 *
 * Validates that the API correctly filters variants whose SKU codes contain the provided search term, handles pagination metadata, and
 * returns proper response structure. Ensures variant summaries include required fields like SKU code, price, stock_quantity, and product info.
 * Verifies pagination metadata reflects current page number, total matching count, limit per page, and total available pages.
 *
 * 1. Use a specific product and search variants with a partial SKU code term.
 * 2. Validate the response structure and pagination metadata.
 * 3. Verify each returned variant summary contains the search term in its SKU code (case-insensitive).
 * 4. Search without a search term to retrieve all variants for the product.
 * 5. Validate pagination metadata is consistent and complete.
 */
export async function test_api_product_variant_search_sku_code(
  connection: api.IConnection,
) {
  // Create actor-specific connection
  const publicConnection: api.IConnection = { host: connection.host };
  // 1. Generate a random product ID and SKU search term
  const productId = typia.random<string & tags.Format<"uuid">>();
  const skuSearchTerm = RandomGenerator.alphaNumeric(4);
  // 2. Search variants with partial SKU code term
  const searchBody = {
    search: skuSearchTerm,
    page: 1,
    limit: 20,
  } satisfies IEcommercePlatformProductVariant.IRequest;
  const searchPage =
    await api.functional.ecommercePlatform.products.variants.index(
      publicConnection,
      {
        productId,
        body: searchBody,
      },
    );
  typia.assert(searchPage);
  // 3. Validate response structure - pagination metadata
  TestValidator.predicate(
    "pagination current page is positive",
    searchPage.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is within bounds",
    searchPage.pagination.limit >= 1 && searchPage.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    searchPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    searchPage.pagination.pages >= 0,
  );
  // 4. Validate response structure - data array
  TestValidator.predicate("data is an array", Array.isArray(searchPage.data));
  TestValidator.predicate(
    "data length does not exceed limit",
    searchPage.data.length <= searchPage.pagination.limit,
  );
  TestValidator.predicate(
    "data length does not exceed total records",
    searchPage.data.length <= searchPage.pagination.records,
  );
  // 5. Validate each variant summary structure
  searchPage.data.forEach((variant) => {
    // SKU code contains the search term (case-insensitive partial match)
    TestValidator.predicate(
      `${variant.sku_code} contains search term ${skuSearchTerm}`,
      variant.sku_code.toLowerCase().includes(skuSearchTerm.toLowerCase()),
    );
    // Each variant has required fields
    TestValidator.predicate(
      `${variant.id} is valid UUID format`,
      variant.id.length === 36,
    );
    TestValidator.predicate(
      `${variant.sku_code} is non-empty`,
      variant.sku_code.length > 0,
    );
    TestValidator.predicate(
      `${variant.sku_code} has valid stock_quantity >= 0`,
      variant.stock_quantity >= 0,
    );
    TestValidator.predicate(
      `${variant.sku_code} has creation timestamp`,
      variant.created_at.length > 0,
    );
    // Product info is populated
    TestValidator.predicate(
      `${variant.sku_code} has product id`,
      variant.product.id.length > 0,
    );
    TestValidator.predicate(
      `${variant.sku_code} has product name`,
      variant.product.name.length > 0,
    );
  });
  // 6. Search without search term to get all variants
  const allVariantsBody = {
    page: 1,
    limit: 50,
  } satisfies IEcommercePlatformProductVariant.IRequest;
  const allPage =
    await api.functional.ecommercePlatform.products.variants.index(
      publicConnection,
      {
        productId,
        body: allVariantsBody,
      },
    );
  typia.assert(allPage);
  // 7. Validate all variants pagination
  TestValidator.equals(
    "all variants search - page 1",
    allPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "all variants search - limit is 50",
    allPage.pagination.limit,
    50,
  );
  TestValidator.predicate(
    "all variants have non-negative records",
    allPage.pagination.records >= 0,
  );
  // When searching with a subset term, results should be <= total results
  TestValidator.predicate(
    "search results are subset of all variants",
    searchPage.data.length <= allPage.pagination.records,
  );
  // 8. Validate variant summaries have proper nested product info
  if (allPage.data.length > 0) {
    const firstVariant = allPage.data[0];
    TestValidator.predicate(
      "variant product has seller profile",
      firstVariant.product.sellerProfile.shop_name.length > 0,
    );
    TestValidator.predicate(
      "variant product has category",
      firstVariant.product.category.name.length > 0,
    );
  }
}
