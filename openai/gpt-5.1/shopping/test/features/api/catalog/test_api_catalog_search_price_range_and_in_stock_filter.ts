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

export async function test_api_catalog_search_price_range_and_in_stock_filter(
  connection: api.IConnection,
) {
  // 1. Register a platform admin to obtain admin authentication context
  const joinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    name: RandomGenerator.name(2),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Create a category tree
  const treeCode: string = `tree-${RandomGenerator.alphaNumeric(8)}`;
  const categoryTreeBody = {
    code: treeCode,
    name: "Main Catalog Tree",
    description: RandomGenerator.paragraph({ sentences: 4 }),
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

  // 3. Create a category under the created tree
  const categoryBody = {
    code: `cat-${RandomGenerator.alphaNumeric(6)}`,
    name: "All Products",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    displayOrder: 1 as number & tags.Type<"int32">,
    isActive: true,
    parentCategoryCode: undefined,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.categories.create(
      connection,
      {
        categoryTreeCode: categoryTree.code,
        body: categoryBody,
      },
    );
  typia.assert<IShoppingMallCategory>(category);

  // 4. Create a brand
  const brandBody = {
    name: `Brand ${RandomGenerator.name(1)}`,
    slug: `brand-${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_uri: "https://cdn.example.com/logo.png" as string & tags.Format<"uri">,
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert<IShoppingMallBrand>(brand);

  // 5. Create several products with the same seller and brand
  const sellerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const createProduct = async (
    suffix: string,
  ): Promise<IShoppingMallProduct> => {
    const productBody = {
      shopping_mall_seller_id: sellerId,
      shopping_mall_brand_id: brand.id,
      code: `PROD-${suffix}-${RandomGenerator.alphaNumeric(6)}` as string &
        tags.MinLength<1>,
      name: `Product ${suffix}` as string & tags.MinLength<1>,
      short_description: RandomGenerator.paragraph({ sentences: 2 }),
      description: RandomGenerator.paragraph({ sentences: 5 }),
      status: "active" as string & tags.MinLength<1>,
      is_multi_sku: true,
      primary_image_uri: "https://cdn.example.com/product.png" as string &
        tags.Format<"uri">,
      additional_data: null,
    } satisfies IShoppingMallProduct.ICreate;

    const product: IShoppingMallProduct =
      await api.functional.shoppingMall.platformAdmin.products.create(
        connection,
        {
          body: productBody,
        },
      );
    typia.assert<IShoppingMallProduct>(product);
    return product;
  };

  const products: IShoppingMallProduct[] = [];
  products.push(await createProduct("LOW"));
  products.push(await createProduct("MID"));
  products.push(await createProduct("HIGH"));

  // 6. Build an unauthenticated connection for public catalog search
  const publicConnection: api.IConnection = {
    host: connection.host,
    simulate: connection.simulate,
    logger: connection.logger,
    encryption: connection.encryption,
    options: connection.options,
    fetch: connection.fetch,
  };

  // 7. Define a price band for search
  const minPrice = 10;
  const maxPrice = 1_000_000;

  // 8. Call catalog search with in_stock_only = true and the price band
  const searchRequest: IShoppingMallCatalogSearch.IRequest = {
    keyword: null,
    category_codes: null,
    brand_ids: null,
    min_price: minPrice,
    max_price: maxPrice,
    in_stock_only: true,
    region_code: null,
    sort_by: null,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 50 as number & tags.Type<"int32"> & tags.Minimum<1>,
  };

  const searchResult: IPageIShoppingMallCatalogSearchResult.ISummary =
    await api.functional.shoppingMall.catalog.search.index(publicConnection, {
      body: searchRequest,
    });
  typia.assert<IPageIShoppingMallCatalogSearchResult.ISummary>(searchResult);

  const pagination: IPage.IPagination = searchResult.pagination;
  typia.assert<IPage.IPagination>(pagination);

  // 9. Validate pagination for the first search
  TestValidator.equals(
    "pagination current page index should be 0 for first page (page=1)",
    pagination.current,
    0,
  );
  TestValidator.equals(
    "pagination limit should equal requested limit",
    pagination.limit,
    searchRequest.limit,
  );
  TestValidator.predicate(
    "pagination.records should be >= data.length",
    pagination.records >= searchResult.data.length,
  );

  if (searchResult.data.length > 0) {
    // 10. Validate each item against the requested price band and in_stock_only
    for (const item of searchResult.data) {
      typia.assert<IShoppingMallCatalogSearchResult.ISummary>(item);

      const productSummary = item.product;
      typia.assert<IShoppingMallProduct.ISummary>(productSummary);

      // in_stock_only=true: require min_price to be defined
      TestValidator.predicate(
        "product.min_price should be defined when in_stock_only is true",
        productSummary.min_price !== undefined,
      );

      if (productSummary.min_price !== undefined) {
        TestValidator.predicate(
          "product.min_price should be >= requested min_price when defined",
          productSummary.min_price >= minPrice,
        );
      }

      if (productSummary.max_price !== undefined) {
        TestValidator.predicate(
          "product.max_price should be <= requested max_price when defined",
          productSummary.max_price <= maxPrice,
        );
      }
    }
  }

  // 11. Second search with an extremely high price band that should likely yield no results
  const highMinPrice = 1_000_000_000;
  const highMaxPrice = 2_000_000_000;

  const highPriceSearchRequest: IShoppingMallCatalogSearch.IRequest = {
    keyword: null,
    category_codes: null,
    brand_ids: null,
    min_price: highMinPrice,
    max_price: highMaxPrice,
    in_stock_only: true,
    region_code: null,
    sort_by: null,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 50 as number & tags.Type<"int32"> & tags.Minimum<1>,
  };

  const highPriceResult: IPageIShoppingMallCatalogSearchResult.ISummary =
    await api.functional.shoppingMall.catalog.search.index(publicConnection, {
      body: highPriceSearchRequest,
    });
  typia.assert<IPageIShoppingMallCatalogSearchResult.ISummary>(highPriceResult);

  const highPagination: IPage.IPagination = highPriceResult.pagination;
  typia.assert<IPage.IPagination>(highPagination);

  if (highPagination.records === 0) {
    TestValidator.equals(
      "when no records, data array should be empty",
      highPriceResult.data.length,
      0,
    );
  }
}
