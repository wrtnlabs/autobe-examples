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

export async function test_api_catalog_search_basic_keyword_and_pagination(
  connection: api.IConnection,
) {
  // 1. Register a platform admin to obtain admin authorization context
  const adminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@admin.example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Create a category tree for catalog organization
  const categoryTreeCode = `tree-${RandomGenerator.alphabets(6)}`;
  const categoryTreeBody = {
    code: categoryTreeCode,
    name: "Main Catalog Tree",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      {
        body: categoryTreeBody,
      },
    );
  typia.assert<IShoppingMallCategoryTree>(categoryTree);

  // 3. Create a category inside the tree
  const categoryCode = `cat-${RandomGenerator.alphabets(6)}`;
  const categoryBody = {
    code: categoryCode,
    name: "Search Test Category",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    displayOrder: 1 as number & tags.Type<"int32">,
    isActive: true,
    parentCategoryCode: undefined,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.categories.create(
      connection,
      {
        categoryTreeCode,
        body: categoryBody,
      },
    );
  typia.assert<IShoppingMallCategory>(category);

  // 4. Create a brand used by the test products
  const brandSlug = `brand-${RandomGenerator.alphabets(6)}`;
  const brandBody = {
    name: "Search Test Brand",
    slug: brandSlug,
    description: RandomGenerator.paragraph({ sentences: 4 }),
    logo_uri: "https://cdn.example.com/logo.png" as string & tags.Format<"uri">,
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert<IShoppingMallBrand>(brand);

  // 5. Seed products: one that clearly matches the keyword, one that does not
  const distinctiveKeyword = "ultra-search-keyword";

  // In a real system seller ID should come from a created seller. For this
  // test we rely on typia.random to obtain a UUID-shaped value that satisfies
  // the type contract in simulator context.
  const sellerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const productCreateCommon = {
    shopping_mall_seller_id: sellerId,
    shopping_mall_brand_id: brand.id,
    status: "active",
    is_multi_sku: false,
    primary_image_uri: "https://cdn.example.com/product.png" as string &
      tags.Format<"uri">,
    additional_data: null,
  } satisfies {
    shopping_mall_seller_id: string & tags.Format<"uuid">;
    shopping_mall_brand_id?: (string & tags.Format<"uuid">) | null | undefined;
    status: string & tags.MinLength<1>;
    is_multi_sku: boolean;
    primary_image_uri?: (string & tags.Format<"uri">) | null | undefined;
    additional_data?: string | null | undefined;
  };

  // Product A: contains the distinctive keyword
  const productACode = `prod-a-${RandomGenerator.alphabets(6)}` as string &
    tags.MinLength<1>;
  const productABody = {
    ...productCreateCommon,
    code: productACode,
    name: `${distinctiveKeyword} main item` as string & tags.MinLength<1>,
    short_description: `This is ${distinctiveKeyword} for catalog search`,
    description: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IShoppingMallProduct.ICreate;

  const productA: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      {
        body: productABody,
      },
    );
  typia.assert<IShoppingMallProduct>(productA);

  // Product B: does not contain the distinctive keyword
  const productBCode = `prod-b-${RandomGenerator.alphabets(6)}` as string &
    tags.MinLength<1>;
  const productBBody = {
    ...productCreateCommon,
    code: productBCode,
    name: "Control item without keyword" as string & tags.MinLength<1>,
    short_description: "Control product for relevance checks",
    description: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IShoppingMallProduct.ICreate;

  const productB: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      {
        body: productBBody,
      },
    );
  typia.assert<IShoppingMallProduct>(productB);

  // 6. Prepare a public (unauthenticated) connection for catalog search
  const publicConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 7. Call the public catalog search endpoint with keyword + pagination
  const page = 1 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const limit = 10 as number & tags.Type<"int32"> & tags.Minimum<1>;

  const searchBody = {
    keyword: distinctiveKeyword,
    category_codes: undefined,
    brand_ids: undefined,
    min_price: undefined,
    max_price: undefined,
    in_stock_only: null,
    region_code: undefined,
    sort_by: undefined,
    page,
    limit,
  } satisfies IShoppingMallCatalogSearch.IRequest;

  const searchResult: IPageIShoppingMallCatalogSearchResult.ISummary =
    await api.functional.shoppingMall.catalog.search.index(publicConnection, {
      body: searchBody,
    });
  typia.assert<IPageIShoppingMallCatalogSearchResult.ISummary>(searchResult);

  const { pagination, data } = searchResult;

  // 8. Pagination invariants
  const expectedCurrent = (page - 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0>;

  TestValidator.equals(
    "pagination current page is zero-based page-1",
    pagination.current,
    expectedCurrent,
  );

  TestValidator.equals(
    "pagination limit matches requested limit",
    pagination.limit,
    limit,
  );

  TestValidator.predicate(
    "records should be at least the number of items in current page",
    pagination.records >= data.length,
  );

  TestValidator.predicate(
    "pages should be at least 1 when records > 0, or 0 when no records",
    pagination.records === 0
      ? pagination.pages === 0
      : pagination.pages >=
          (1 as number & tags.Type<"int32"> & tags.Minimum<0>),
  );

  // 9. Business expectation: at least one product with the keyword appears
  const hasKeywordMatch = data.some((item) =>
    item.product.name.toLowerCase().includes(distinctiveKeyword.toLowerCase()),
  );

  TestValidator.predicate(
    "at least one search result product name contains the distinctive keyword",
    hasKeywordMatch,
  );

  TestValidator.predicate(
    "records should be >= 1 when a keyword match exists",
    !hasKeywordMatch || pagination.records >= 1,
  );
}
