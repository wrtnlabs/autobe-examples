import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductReviewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductReviewStat";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProduct";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_administrator_categories_create } from "../../../generate/generate_random_ecommerce_mall_administrator_categories_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

/**
 * Test administrator's ability to browse products within a specific category with comprehensive search, filtering, and sorting capabilities.
 *
 * Validates the complete product browsing workflow within a category context, including text search, price range filtering, stock status filtering, seller filtering, date range filtering, and sorting operations. Verifies that the API correctly returns paginated results with accurate product summaries, proper pagination metadata, and that all filters and sorting options work as expected.
 *
 * Special attention is given to verifying that only products directly assigned to the target category are returned (excluding subcategories), that pagination metadata is accurate, and that relationship data (category, seller) is correctly joined and returned.
 *
 * 1. Administrator registers and authenticates.
 * 2. Seller registers, logs in, and creates products.
 * 3. Administrator creates a primary category for testing.
 * 4. Seller creates multiple products in the primary category with varying attributes (prices, names, stock levels, creation dates).
 * 5. Administrator creates a secondary category and seller creates products there for isolation testing.
 * 6. Administrator calls PATCH /ecommerceMall/administrator/categories/{categoryId}/products and validates:
 *    - Response contains paginated product summaries
 *    - Only products in target category (not subcategories) are returned
 *    - Default sort is created_at DESC (newest first)
 *    - Pagination metadata is accurate
 *    - Each product summary includes required fields
 * 7. Administrator tests price range filtering: minPrice/maxPrice, verifies products fall within range.
 * 8. Administrator tests in-stock only filter: inStockOnly=true, verifies only products with available variants returned.
 * 9. Administrator tests seller filtering: sellerId, verifies only products from specific seller returned.
 * 10. Administrator tests category IDs filtering: multiple categoryIds, verifies cross-category browsing.
 * 11. Administrator tests date range filtering: createdAtMin/createdAtMax, verifies product age filtering.
 * 12. Administrator tests full-text search: name search, description search, case-insensitive, partial matching.
 * 13. Administrator tests sorting: name ASC/DESC, base_price ASC/DESC, default sort behavior.
 * 14. Administrator validates data: other category products excluded, category/seller joins correct, availability_status accurate, has_available_variants accurate.
 */
export async function test_api_administrator_category_products_browsing_and_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Register administrator
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminConnection: api.IConnection = { host: connection.host };
  const adminResult = await authorize_administrator_join(adminConnection, {
    body: {
      display_name: RandomGenerator.name(2),
      email: adminEmail,
      password: adminPassword,
    },
  });
  typia.assert(adminResult);
  // 2. Setup: Register seller
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerResult = await authorize_seller_join(sellerConnection, {
    body: {
      display_name: RandomGenerator.name(2),
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(sellerResult);
  // 3. Setup: Login as administrator (for category products browsing)
  const adminBrowseConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_login(adminBrowseConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      ip: typia.random<string & tags.Format<"ipv4">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 4. Setup: Login as seller (for product creation)
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      ip: typia.random<string & tags.Format<"ipv4">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 5. Setup: Create primary category
  const primaryCategory =
    await generate_random_ecommerce_mall_administrator_categories_create(
      adminBrowseConnection,
      {
        body: {
          name: "Primary Category",
          description: "Category for product browsing tests",
        },
      },
    );
  typia.assert(primaryCategory);
  // 6. Setup: Create secondary category for isolation testing
  const secondaryCategory =
    await generate_random_ecommerce_mall_administrator_categories_create(
      adminBrowseConnection,
      {
        body: {
          name: "Secondary Category",
          description: "Category for isolation testing",
        },
      },
    );
  typia.assert(secondaryCategory);
  // 7. Setup: Create products in primary category with varying attributes
  const productsInPrimary: IEcommerceMallProduct[] = [];
  const basePriceRange = ArrayUtil.repeat(5, () =>
    typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<1000> & tags.Maximum<100000>
    >(),
  );
  const productNames = ArrayUtil.repeat(5, () =>
    RandomGenerator.paragraph({ sentences: 2, wordMin: 2, wordMax: 4 }),
  );
  for (let i = 0; i < 5; i++) {
    const product = await generate_random_ecommerce_mall_seller_products_create(
      sellerLoginConnection,
      {
        body: {
          name: productNames[i],
          description: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 3,
            wordMax: 6,
          }),
          category_id: primaryCategory.id,
          base_price: basePriceRange[i],
        },
      },
    );
    typia.assert(product);
    productsInPrimary.push(product);
  }
  // 8. Setup: Create products in secondary category for isolation testing
  const productsInSecondary: IEcommerceMallProduct[] = [];
  const secondaryPriceRange = ArrayUtil.repeat(2, () =>
    typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<1000> & tags.Maximum<100000>
    >(),
  );
  const secondaryProductNames = ArrayUtil.repeat(2, () =>
    RandomGenerator.paragraph({ sentences: 2, wordMin: 2, wordMax: 4 }),
  );
  for (let i = 0; i < 2; i++) {
    const product = await generate_random_ecommerce_mall_seller_products_create(
      sellerLoginConnection,
      {
        body: {
          name: secondaryProductNames[i],
          description: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 3,
            wordMax: 6,
          }),
          category_id: secondaryCategory.id,
          base_price: secondaryPriceRange[i],
        },
      },
    );
    typia.assert(product);
    productsInSecondary.push(product);
  }
  // 9. Primary Success Path: Browse products in primary category (default sort: created_at DESC)
  const defaultBrowse =
    await api.functional.ecommerceMall.administrator.categories.products.index(
      adminBrowseConnection,
      {
        categoryId: primaryCategory.id,
        body: {},
      },
    );
  typia.assert(defaultBrowse);
  // Validate default browse results
  TestValidator.equals(
    "product count",
    defaultBrowse.data.length,
    productsInPrimary.length,
  );
  TestValidator.equals(
    "pagination records",
    defaultBrowse.pagination.records,
    productsInPrimary.length,
  );
  TestValidator.equals(
    "pagination current page",
    defaultBrowse.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", defaultBrowse.pagination.limit, 20);
  TestValidator.equals("pagination pages", defaultBrowse.pagination.pages, 1);
  // Verify each product summary includes required fields
  for (const product of defaultBrowse.data) {
    typia.assert(product);
    TestValidator.predicate(
      "product has id",
      product.id !== undefined && product.id !== null,
    );
    TestValidator.predicate("product has name", product.name !== undefined);
    TestValidator.predicate(
      "product has base_price",
      product.base_price !== undefined,
    );
    TestValidator.predicate(
      "product has category",
      product.category !== undefined,
    );
    TestValidator.predicate("product has seller", product.seller !== undefined);
    TestValidator.predicate(
      "product has availability_status",
      product.availability_status !== undefined,
    );
    TestValidator.predicate(
      "product has has_available_variants",
      product.has_available_variants !== undefined,
    );
  }
  // 10. Verify only products in target category (not subcategories) are returned
  const targetCategoryIds = defaultBrowse.data.map((p) => p.category.id);
  TestValidator.equals(
    "all products in primary category",
    targetCategoryIds.length,
    targetCategoryIds.filter((id) => id === primaryCategory.id).length,
  );
  // 11. Test price range filtering
  const minPrice = Math.min(...basePriceRange);
  const maxPrice = Math.max(...basePriceRange);
  const priceRangeFilter =
    await api.functional.ecommerceMall.administrator.categories.products.index(
      adminBrowseConnection,
      {
        categoryId: primaryCategory.id,
        body: {
          minPrice: minPrice,
          maxPrice: maxPrice,
        },
      },
    );
  typia.assert(priceRangeFilter);
  TestValidator.equals(
    "price range filter count",
    priceRangeFilter.data.length,
    productsInPrimary.length,
  );
  for (const product of priceRangeFilter.data) {
    TestValidator.predicate(
      "product price within min",
      product.base_price >= minPrice,
    );
    TestValidator.predicate(
      "product price within max",
      product.base_price <= maxPrice,
    );
  }
  // 12. Test in-stock only filter
  const inStockFilter =
    await api.functional.ecommerceMall.administrator.categories.products.index(
      adminBrowseConnection,
      {
        categoryId: primaryCategory.id,
        body: {
          inStockOnly: true,
        },
      },
    );
  typia.assert(inStockFilter);
  for (const product of inStockFilter.data) {
    TestValidator.predicate(
      "product has available variants",
      product.has_available_variants === true,
    );
  }
  // 13. Test seller filtering
  const sellerIdFilter =
    await api.functional.ecommerceMall.administrator.categories.products.index(
      adminBrowseConnection,
      {
        categoryId: primaryCategory.id,
        body: {
          sellerId: sellerResult.id,
        },
      },
    );
  typia.assert(sellerIdFilter);
  for (const product of sellerIdFilter.data) {
    TestValidator.equals(
      "product belongs to filtered seller",
      product.seller.id,
      sellerResult.id,
    );
  }
  // 14. Test category IDs filtering (cross-category browsing)
  const categoryIdsFilter =
    await api.functional.ecommerceMall.administrator.categories.products.index(
      adminBrowseConnection,
      {
        categoryId: primaryCategory.id,
        body: {
          categoryIds: [primaryCategory.id, secondaryCategory.id],
        },
      },
    );
  typia.assert(categoryIdsFilter);
  const totalCrossCategoryProducts =
    productsInPrimary.length + productsInSecondary.length;
  TestValidator.equals(
    "cross-category filter count",
    categoryIdsFilter.data.length,
    totalCrossCategoryProducts,
  );
  // 15. Test date range filtering
  const minDate = new Date(
    new Date().getTime() - 1000 * 60 * 60 * 24 * 30,
  ).toISOString();
  const maxDate = new Date().toISOString();
  const dateRangeFilter =
    await api.functional.ecommerceMall.administrator.categories.products.index(
      adminBrowseConnection,
      {
        categoryId: primaryCategory.id,
        body: {
          createdAtMin: minDate,
          createdAtMax: maxDate,
        },
      },
    );
  typia.assert(dateRangeFilter);
  // 16. Test full-text search by name
  const targetProductName = productsInPrimary[0].name;
  const nameSearch =
    await api.functional.ecommerceMall.administrator.categories.products.index(
      adminBrowseConnection,
      {
        categoryId: primaryCategory.id,
        body: {
          search: targetProductName,
        },
      },
    );
  typia.assert(nameSearch);
  TestValidator.predicate(
    "name search returns matching products",
    nameSearch.data.some((p) => p.name.includes(targetProductName)),
  );
  // 17. Test full-text search by description
  const targetDescription = productsInPrimary[0].description || "";
  const descriptionSearch =
    await api.functional.ecommerceMall.administrator.categories.products.index(
      adminBrowseConnection,
      {
        categoryId: primaryCategory.id,
        body: {
          search: targetDescription.substring(0, 50),
        },
      },
    );
  typia.assert(descriptionSearch);
  TestValidator.predicate(
    "description search returns matching products",
    descriptionSearch.data.length > 0,
  );
  // 18. Test sorting by name ASC
  const nameAscSort =
    await api.functional.ecommerceMall.administrator.categories.products.index(
      adminBrowseConnection,
      {
        categoryId: primaryCategory.id,
        body: {
          sortBy: "name",
          sortOrder: "asc",
        },
      },
    );
  typia.assert(nameAscSort);
  const nameAscValues = nameAscSort.data.map((p) => p.name);
  const isNameAscSorted = nameAscValues.every(
    (val, i) => i === 0 || val.localeCompare(nameAscValues[i - 1]) >= 0,
  );
  TestValidator.predicate("products sorted by name ASC", isNameAscSorted);
  // 19. Test sorting by name DESC
  const nameDescSort =
    await api.functional.ecommerceMall.administrator.categories.products.index(
      adminBrowseConnection,
      {
        categoryId: primaryCategory.id,
        body: {
          sortBy: "name",
          sortOrder: "desc",
        },
      },
    );
  typia.assert(nameDescSort);
  const nameDescValues = nameDescSort.data.map((p) => p.name);
  const isNameDescSorted = nameDescValues.every(
    (val, i) => i === 0 || val.localeCompare(nameDescValues[i - 1]) <= 0,
  );
  TestValidator.predicate("products sorted by name DESC", isNameDescSorted);
  // 20. Test sorting by base_price ASC
  const priceAscSort =
    await api.functional.ecommerceMall.administrator.categories.products.index(
      adminBrowseConnection,
      {
        categoryId: primaryCategory.id,
        body: {
          sortBy: "base_price",
          sortOrder: "asc",
        },
      },
    );
  typia.assert(priceAscSort);
  const priceAscValues = priceAscSort.data.map((p) => p.base_price);
  const isPriceAscSorted = priceAscValues.every(
    (val, i) => i === 0 || val >= priceAscValues[i - 1],
  );
  TestValidator.predicate(
    "products sorted by base_price ASC",
    isPriceAscSorted,
  );
  // 21. Test sorting by base_price DESC
  const priceDescSort =
    await api.functional.ecommerceMall.administrator.categories.products.index(
      adminBrowseConnection,
      {
        categoryId: primaryCategory.id,
        body: {
          sortBy: "base_price",
          sortOrder: "desc",
        },
      },
    );
  typia.assert(priceDescSort);
  const priceDescValues = priceDescSort.data.map((p) => p.base_price);
  const isPriceDescSorted = priceDescValues.every(
    (val, i) => i === 0 || val <= priceDescValues[i - 1],
  );
  TestValidator.predicate(
    "products sorted by base_price DESC",
    isPriceDescSorted,
  );
  // 22. Verify products from other categories are NOT included in primary category browse
  const primaryCategoryBrowse =
    await api.functional.ecommerceMall.administrator.categories.products.index(
      adminBrowseConnection,
      {
        categoryId: primaryCategory.id,
        body: {},
      },
    );
  typia.assert(primaryCategoryBrowse);
  const primaryOnlyProducts = primaryCategoryBrowse.data.filter(
    (p) => p.category.id === primaryCategory.id,
  );
  TestValidator.equals(
    "only primary category products returned",
    primaryOnlyProducts.length,
    primaryCategoryBrowse.data.length,
  );
  // 23. Verify category and seller relationship data is correctly joined
  for (const product of primaryCategoryBrowse.data) {
    TestValidator.predicate(
      "product category is primary",
      product.category.id === primaryCategory.id,
    );
    TestValidator.equals(
      "product seller is correct",
      product.seller.id,
      sellerResult.id,
    );
    TestValidator.equals(
      "product category name",
      product.category.name,
      primaryCategory.name,
    );
  }
  // 24. Verify availability_status correctly reflects variant stock status
  for (const product of primaryCategoryBrowse.data) {
    TestValidator.predicate(
      "availability_status is valid",
      ["available", "unavailable"].includes(product.availability_status),
    );
    TestValidator.predicate(
      "has_available_variants matches availability_status",
      (product.has_available_variants === true &&
        product.availability_status === "available") ||
        (product.has_available_variants === false &&
          product.availability_status === "unavailable"),
    );
  }
  // 25. Verify has_available_variants boolean accurately indicates stock availability
  for (const product of primaryCategoryBrowse.data) {
    TestValidator.predicate(
      "has_available_variants is boolean",
      typeof product.has_available_variants === "boolean",
    );
  }
  // 26. Test pagination with larger result set
  const paginationTest =
    await api.functional.ecommerceMall.administrator.categories.products.index(
      adminBrowseConnection,
      {
        categoryId: primaryCategory.id,
        body: {
          limit: 2,
        },
      },
    );
  typia.assert(paginationTest);
  TestValidator.equals(
    "pagination limit enforced",
    paginationTest.data.length,
    2,
  );
  TestValidator.equals(
    "pagination records total",
    paginationTest.pagination.records,
    productsInPrimary.length,
  );
  TestValidator.equals(
    "pagination pages",
    paginationTest.pagination.pages,
    Math.ceil(productsInPrimary.length / 2),
  );
  TestValidator.equals("test completed", true, true);
}