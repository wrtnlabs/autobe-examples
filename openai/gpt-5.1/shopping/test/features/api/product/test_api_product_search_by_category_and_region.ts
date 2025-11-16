import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryTree";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallRegionSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegionSetting";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";

export async function test_api_product_search_by_category_and_region(
  connection: api.IConnection,
) {
  // 1. Register and login as platform admin (join already authenticates and sets token)
  const platformAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.shopping-mall.test/join",
    referrer: "https://admin.shopping-mall.test/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2. Create an active region setting
  const regionCreateBody = {
    code: `REGION-${RandomGenerator.alphaNumeric(6)}`,
    name: "Test Region",
    iso_country_code: "KR",
    currency_code: "KRW",
    timezone: "Asia/Seoul",
    active: true,
  } satisfies IShoppingMallRegionSetting.ICreate;

  const region: IShoppingMallRegionSetting =
    await api.functional.shoppingMall.platformAdmin.regionSettings.create(
      connection,
      {
        body: regionCreateBody,
      },
    );
  typia.assert(region);

  // 3. Create a category tree (we cannot attach products to categories yet but we ensure tree creation works)
  const categoryTreeCreateBody = {
    code: `TREE-${RandomGenerator.alphaNumeric(6)}`,
    name: "Main Catalog Tree",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    active: true,
    defaultLocale: "ko-KR",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      {
        body: categoryTreeCreateBody,
      },
    );
  typia.assert(categoryTree);

  // Avoid unused variable warning in case categoryTree is not directly used
  TestValidator.predicate(
    "category tree should have non-empty id",
    categoryTree.id.length > 0,
  );

  // 4. Create two brands for inclusion/exclusion checks
  const brandACreateBody = {
    name: `Brand-A-${RandomGenerator.alphaNumeric(6)}`,
    slug: `brand-a-${RandomGenerator.alphaNumeric(6)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_uri: "https://cdn.shopping-mall.test/logo/brand-a.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brandA: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandACreateBody,
    });
  typia.assert(brandA);

  const brandBCreateBody = {
    name: `Brand-B-${RandomGenerator.alphaNumeric(6)}`,
    slug: `brand-b-${RandomGenerator.alphaNumeric(6)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_uri: "https://cdn.shopping-mall.test/logo/brand-b.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brandB: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBCreateBody,
    });
  typia.assert(brandB);

  // 5. Register a seller and obtain seller session
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    storeName: `Store-${RandomGenerator.alphaNumeric(6)}`,
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(seller);

  const sellerId = seller.id;

  // 6. Seller creates two active products with different brands
  const baseCodePrefix = RandomGenerator.alphaNumeric(6);

  const productACreateBody = {
    shopping_mall_seller_id: sellerId,
    shopping_mall_brand_id: brandA.id,
    code: `P-A-${baseCodePrefix}`,
    name: `Category-Region Product A ${baseCodePrefix}`,
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: false,
    primary_image_uri: "https://cdn.shopping-mall.test/product/a.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const productA: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productACreateBody,
    });
  typia.assert(productA);

  const productBCreateBody = {
    shopping_mall_seller_id: sellerId,
    shopping_mall_brand_id: brandB.id,
    code: `P-B-${baseCodePrefix}`,
    name: `Other Category Product B ${baseCodePrefix}`,
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: false,
    primary_image_uri: "https://cdn.shopping-mall.test/product/b.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const productB: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBCreateBody,
    });
  typia.assert(productB);

  // 7. Create a draft product (to validate status filter exclusion) using platformAdmin product API
  const productDraftCreateBody = {
    shopping_mall_seller_id: sellerId,
    shopping_mall_brand_id: brandA.id,
    code: `P-D-${baseCodePrefix}`,
    name: `Draft Product ${baseCodePrefix}`,
    short_description: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    status: "draft",
    is_multi_sku: false,
    primary_image_uri: "https://cdn.shopping-mall.test/product/draft.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const draftProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      {
        body: productDraftCreateBody,
      },
    );
  typia.assert(draftProduct);

  // 8. Prepare an anonymous connection (no auth headers) to simulate guest search
  const anonymousConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Helper to collect ids from product summaries
  const collectIds = (page: IPageIShoppingMallProduct.ISummary): string[] =>
    page.data.map((p) => p.id);

  // --- Query 1: Filter by brand A and active status ---
  const requestBrandA = {
    page: 1,
    page_size: 20,
    sort_field: "created_at",
    sort_direction: "desc",
    keyword: undefined,
    status: "active",
    seller_id: undefined,
    brand_id: brandA.id,
    category_ids: [],
    region_setting_id: region.id,
    channel: undefined,
    min_price: undefined,
    max_price: undefined,
    in_stock_only: undefined,
    compliance_flag_types: undefined,
  } satisfies IShoppingMallProduct.IRequest;

  const pageBrandA: IPageIShoppingMallProduct.ISummary =
    await api.functional.shoppingMall.products.index(anonymousConnection, {
      body: requestBrandA,
    });
  typia.assert(pageBrandA);

  const idsBrandA = collectIds(pageBrandA);

  TestValidator.predicate(
    "brand A search should include product A",
    idsBrandA.includes(productA.id),
  );
  TestValidator.predicate(
    "brand A search should not include product B",
    !idsBrandA.includes(productB.id),
  );
  TestValidator.predicate(
    "brand A search should not include draft product",
    !idsBrandA.includes(draftProduct.id),
  );

  // --- Query 2: Filter by brand B and active status ---
  const requestBrandB = {
    page: 1,
    page_size: 20,
    sort_field: "created_at",
    sort_direction: "desc",
    keyword: undefined,
    status: "active",
    seller_id: undefined,
    brand_id: brandB.id,
    category_ids: [],
    region_setting_id: region.id,
    channel: undefined,
    min_price: undefined,
    max_price: undefined,
    in_stock_only: undefined,
    compliance_flag_types: undefined,
  } satisfies IShoppingMallProduct.IRequest;

  const pageBrandB: IPageIShoppingMallProduct.ISummary =
    await api.functional.shoppingMall.products.index(anonymousConnection, {
      body: requestBrandB,
    });
  typia.assert(pageBrandB);

  const idsBrandB = collectIds(pageBrandB);

  TestValidator.predicate(
    "brand B search should include product B",
    idsBrandB.includes(productB.id),
  );
  TestValidator.predicate(
    "brand B search should not include product A",
    !idsBrandB.includes(productA.id),
  );
  TestValidator.predicate(
    "brand B search should not include draft product",
    !idsBrandB.includes(draftProduct.id),
  );

  // --- Query 3: Filter only by active status (no brand filter) ---
  const requestActiveOnly = {
    page: 1,
    page_size: 50,
    sort_field: "created_at",
    sort_direction: "desc",
    keyword: undefined,
    status: "active",
    seller_id: undefined,
    brand_id: undefined,
    category_ids: [],
    region_setting_id: region.id,
    channel: undefined,
    min_price: undefined,
    max_price: undefined,
    in_stock_only: undefined,
    compliance_flag_types: undefined,
  } satisfies IShoppingMallProduct.IRequest;

  const pageActiveOnly: IPageIShoppingMallProduct.ISummary =
    await api.functional.shoppingMall.products.index(anonymousConnection, {
      body: requestActiveOnly,
    });
  typia.assert(pageActiveOnly);

  const idsActiveOnly = collectIds(pageActiveOnly);

  TestValidator.predicate(
    "active-only search should include product A",
    idsActiveOnly.includes(productA.id),
  );
  TestValidator.predicate(
    "active-only search should include product B",
    idsActiveOnly.includes(productB.id),
  );
  TestValidator.predicate(
    "active-only search should not include draft product",
    !idsActiveOnly.includes(draftProduct.id),
  );

  // Basic pagination sanity checks
  TestValidator.predicate(
    "brand A search pagination records should be >= 1",
    pageBrandA.pagination.records >= 1,
  );
  TestValidator.predicate(
    "brand B search pagination records should be >= 1",
    pageBrandB.pagination.records >= 1,
  );
  TestValidator.predicate(
    "active-only search pagination records should be >= 2",
    pageActiveOnly.pagination.records >= 2,
  );
}
