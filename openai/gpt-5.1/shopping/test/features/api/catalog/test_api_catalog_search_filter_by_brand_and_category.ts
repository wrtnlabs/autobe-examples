import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCatalogSearchResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCatalogSearchResult";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCatalogSearch } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCatalogSearch";
import type { IShoppingMallCatalogSearchResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCatalogSearchResult";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryTree";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate public catalog search filtering by brand.
 *
 * Business goal: Ensure that the public `/shoppingMall/catalog/search` endpoint
 * correctly filters results by brand when `brand_ids` is provided, and that
 * pagination metadata is self-consistent. Category binding APIs are not
 * available in this context, so the test focuses on brand-based filtering
 * only.
 *
 * High level workflow:
 *
 * 1. Register a platform admin (POST /auth/platformAdmin/join).
 * 2. As platform admin, create two brands (Brand A and Brand B).
 * 3. Create a category tree and two categories (for realism only).
 * 4. Create two products, one associated to Brand A and one to Brand B. Seller
 *    association comes from random data, as seller creation is out of scope for
 *    this test.
 * 5. Call PATCH /shoppingMall/catalog/search without authentication, filtering by
 *    Brand A only.
 * 6. Assert that at least one result on the page belongs to Brand A and that no
 *    result on that page belongs to Brand B.
 * 7. Repeat search filtering by Brand B only and assert the symmetric behavior.
 * 8. Validate that pagination metadata fields are internally self-consistent.
 */
export async function test_api_catalog_search_filter_by_brand_and_category(
  connection: api.IConnection,
) {
  // 1. Register platform admin and obtain authorized connection
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.shoppingmall.test/join",
    referrer: "https://shoppingmall.test/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Create two brands (Brand A and Brand B)
  const brandABody = {
    name: `Brand-A-${RandomGenerator.alphabets(5)}`,
    slug: `brand-a-${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_uri: "https://cdn.shoppingmall.test/logos/brand-a.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brandA: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandABody,
    });
  typia.assert(brandA);

  const brandBBody = {
    name: `Brand-B-${RandomGenerator.alphabets(5)}`,
    slug: `brand-b-${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_uri: "https://cdn.shoppingmall.test/logos/brand-b.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brandB: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBBody,
    });
  typia.assert(brandB);

  // 3. Create a category tree and two categories (X and Y)
  const treeBody = {
    code: `tree-${RandomGenerator.alphaNumeric(6)}`,
    name: "Main Catalog Tree",
    description: "Tree used for catalog search filter tests",
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      { body: treeBody },
    );
  typia.assert(categoryTree);

  const categoryABody = {
    code: `cat-a-${RandomGenerator.alphaNumeric(5)}`,
    name: "Category-X",
    description: "Category X for brand filter test",
    displayOrder: 1,
    isActive: true,
    parentCategoryCode: undefined,
  } satisfies IShoppingMallCategory.ICreate;

  const categoryA: IShoppingMallCategory =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.categories.create(
      connection,
      {
        categoryTreeCode: categoryTree.code,
        body: categoryABody,
      },
    );
  typia.assert(categoryA);

  const categoryBBody = {
    code: `cat-b-${RandomGenerator.alphaNumeric(5)}`,
    name: "Category-Y",
    description: "Category Y for brand filter test",
    displayOrder: 2,
    isActive: true,
    parentCategoryCode: undefined,
  } satisfies IShoppingMallCategory.ICreate;

  const categoryB: IShoppingMallCategory =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.categories.create(
      connection,
      {
        categoryTreeCode: categoryTree.code,
        body: categoryBBody,
      },
    );
  typia.assert(categoryB);

  // 4. Create two products with different brands.
  // We rely on random ICreate bodies for seller association and
  // override only brand and code/name/status-related fields we care
  // about.
  const baseProductCreateA = typia.random<IShoppingMallProduct.ICreate>();
  const productABody = {
    ...baseProductCreateA,
    shopping_mall_brand_id: brandA.id,
    code: `prod-a-${RandomGenerator.alphaNumeric(6)}` as string &
      tags.MinLength<1>,
    name: `Product-A-${RandomGenerator.alphabets(5)}` as string &
      tags.MinLength<1>,
    status: "active" as string & tags.MinLength<1>,
  } satisfies IShoppingMallProduct.ICreate;

  const productA: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      {
        body: productABody,
      },
    );
  typia.assert(productA);

  const baseProductCreateB = typia.random<IShoppingMallProduct.ICreate>();
  const productBBody = {
    ...baseProductCreateB,
    shopping_mall_brand_id: brandB.id,
    code: `prod-b-${RandomGenerator.alphaNumeric(6)}` as string &
      tags.MinLength<1>,
    name: `Product-B-${RandomGenerator.alphabets(5)}` as string &
      tags.MinLength<1>,
    status: "active" as string & tags.MinLength<1>,
  } satisfies IShoppingMallProduct.ICreate;

  const productB: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      {
        body: productBBody,
      },
    );
  typia.assert(productB);

  // 5. Build an unauthenticated connection for public catalog search
  const publicConnection: api.IConnection = { ...connection, headers: {} };

  // Helper to validate pagination consistency
  const assertPagination = (
    pagination: IPage.IPagination,
    titlePrefix: string,
  ) => {
    TestValidator.predicate(
      `${titlePrefix} current page index is non-negative`,
      pagination.current >= 0,
    );
    TestValidator.predicate(
      `${titlePrefix} limit is non-negative`,
      pagination.limit >= 0,
    );
    TestValidator.predicate(
      `${titlePrefix} records is non-negative`,
      pagination.records >= 0,
    );
    TestValidator.predicate(
      `${titlePrefix} pages is non-negative`,
      pagination.pages >= 0,
    );
    if (pagination.records === 0) {
      TestValidator.equals(
        `${titlePrefix} has zero pages when there are no records`,
        pagination.pages,
        0,
      );
    }
  };

  // 6. Search filtering by Brand A only
  const searchByBrandARequest = {
    keyword: null,
    category_codes: null,
    brand_ids: [brandA.id],
    min_price: null,
    max_price: null,
    in_stock_only: null,
    region_code: null,
    sort_by: null,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallCatalogSearch.IRequest;

  const searchByBrandA: IPageIShoppingMallCatalogSearchResult.ISummary =
    await api.functional.shoppingMall.catalog.search.index(publicConnection, {
      body: searchByBrandARequest,
    });
  typia.assert(searchByBrandA);

  assertPagination(searchByBrandA.pagination, "brand A search");

  const resultsBrandA: IShoppingMallCatalogSearchResult.ISummary[] =
    searchByBrandA.data;

  const hasBrandA = resultsBrandA.some((item) => item.brand?.id === brandA.id);
  const hasBrandBInA = resultsBrandA.some(
    (item) => item.brand?.id === brandB.id,
  );

  TestValidator.predicate(
    "search by Brand A returns at least one item for Brand A on current page",
    hasBrandA,
  );
  TestValidator.predicate(
    "search by Brand A does not include Brand B on current page",
    !hasBrandBInA,
  );

  // 7. Search filtering by Brand B only
  const searchByBrandBRequest = {
    keyword: null,
    category_codes: null,
    brand_ids: [brandB.id],
    min_price: null,
    max_price: null,
    in_stock_only: null,
    region_code: null,
    sort_by: null,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallCatalogSearch.IRequest;

  const searchByBrandB: IPageIShoppingMallCatalogSearchResult.ISummary =
    await api.functional.shoppingMall.catalog.search.index(publicConnection, {
      body: searchByBrandBRequest,
    });
  typia.assert(searchByBrandB);

  assertPagination(searchByBrandB.pagination, "brand B search");

  const resultsBrandB: IShoppingMallCatalogSearchResult.ISummary[] =
    searchByBrandB.data;

  const hasBrandB = resultsBrandB.some((item) => item.brand?.id === brandB.id);
  const hasBrandAInB = resultsBrandB.some(
    (item) => item.brand?.id === brandA.id,
  );

  TestValidator.predicate(
    "search by Brand B returns at least one item for Brand B on current page",
    hasBrandB,
  );
  TestValidator.predicate(
    "search by Brand B does not include Brand A on current page",
    !hasBrandAInB,
  );
}
