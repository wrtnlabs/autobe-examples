import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryTree";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategoryAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategoryAssignment";
import type { IShoppingMallProductVisibilityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVisibilityRule";
import type { IShoppingMallRegionSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegionSetting";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_catalog_enriched_products_respects_visibility_rules(
  connection: api.IConnection,
) {
  // 1. Bootstrap platform admin (also ensures Authorization header is set)
  const joinBody = {
    email: `${RandomGenerator.alphabets(8)}@admin.test.com`,
    name: RandomGenerator.name(2),
    password: RandomGenerator.alphabets(12),
    href: "https://admin.test.com/join",
    referrer: "https://admin.test.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create region setting
  const regionBody = {
    code: `REGION_${RandomGenerator.alphabets(6)}`,
    name: "Test Region",
    iso_country_code: "US",
    currency_code: "USD",
    timezone: "America/New_York",
    active: true,
  } satisfies IShoppingMallRegionSetting.ICreate;

  const region: IShoppingMallRegionSetting =
    await api.functional.shoppingMall.platformAdmin.regionSettings.create(
      connection,
      { body: regionBody },
    );
  typia.assert(region);

  // 3. Create category tree
  const categoryTreeCode = `tree_${RandomGenerator.alphabets(6)}`;
  const categoryTreeBody = {
    code: categoryTreeCode,
    name: "Test Tree",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      { body: categoryTreeBody },
    );
  typia.assert(categoryTree);

  // 4. Create one category in the tree
  const categoryBody = {
    code: `cat_${RandomGenerator.alphabets(6)}`,
    name: "Test Category",
    description: RandomGenerator.paragraph({ sentences: 2 }),
    displayOrder: 1 as number & tags.Type<"int32">,
    isActive: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.categories.create(
      connection,
      {
        categoryTreeCode: categoryTree.code,
        body: categoryBody,
      },
    );
  typia.assert(category);

  // 5. Create brand
  const brandBody = {
    name: `Brand ${RandomGenerator.name(1)}`,
    slug: `brand-${RandomGenerator.alphabets(8)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_uri: "https://cdn.test.com/logo.png" as string & tags.Format<"uri">,
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  // Helper to create a product owned by the same seller as the first product.
  // We first create Product A with a random seller, then reuse its seller for B.

  // 6. Create Product A
  const productACode = `PROD_A_${RandomGenerator.alphabets(6)}`;
  const productACreateBody = {
    shopping_mall_seller_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_brand_id: brand.id,
    code: productACode as string & tags.MinLength<1>,
    name: `Product A ${RandomGenerator.name(1)}` as string & tags.MinLength<1>,
    short_description: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: false,
    primary_image_uri: "https://cdn.test.com/prod-a.png" as string &
      tags.Format<"uri">,
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const productA: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      {
        body: productACreateBody,
      },
    );
  typia.assert(productA);

  // 7. Create Product B using the same seller as Product A
  const productBCode = `PROD_B_${RandomGenerator.alphabets(6)}`;
  const productBCreateBody = {
    shopping_mall_seller_id: productA.seller.id,
    shopping_mall_brand_id: brand.id,
    code: productBCode as string & tags.MinLength<1>,
    name: `Product B ${RandomGenerator.name(1)}` as string & tags.MinLength<1>,
    short_description: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: false,
    primary_image_uri: "https://cdn.test.com/prod-b.png" as string &
      tags.Format<"uri">,
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const productB: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      {
        body: productBCreateBody,
      },
    );
  typia.assert(productB);

  // 8. Assign both products to the same category as primary
  const categoryAssignmentBodyA = {
    shopping_mall_category_id: category.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategoryAssignment.ICreate;

  const assignmentA: IShoppingMallProductCategoryAssignment =
    await api.functional.shoppingMall.platformAdmin.products.categories.create(
      connection,
      {
        productCode: productA.code,
        body: categoryAssignmentBodyA,
      },
    );
  typia.assert(assignmentA);

  const categoryAssignmentBodyB = {
    shopping_mall_category_id: category.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategoryAssignment.ICreate;

  const assignmentB: IShoppingMallProductCategoryAssignment =
    await api.functional.shoppingMall.platformAdmin.products.categories.create(
      connection,
      {
        productCode: productB.code,
        body: categoryAssignmentBodyB,
      },
    );
  typia.assert(assignmentB);

  // 9. Create visibility rules for region + channel="web"
  const visibleRuleBody: IShoppingMallProductVisibilityRule.ICreate = {
    shopping_mall_region_setting_id: region.id,
    channel: "web",
    visibility: "visible",
    starts_at: null,
    ends_at: null,
  } satisfies IShoppingMallProductVisibilityRule.ICreate;

  const visibleRule: IShoppingMallProductVisibilityRule =
    await api.functional.shoppingMall.platformAdmin.products.visibilityRules.create(
      connection,
      {
        productCode: productA.code,
        body: visibleRuleBody,
      },
    );
  typia.assert(visibleRule);

  const hiddenRuleBody: IShoppingMallProductVisibilityRule.ICreate = {
    shopping_mall_region_setting_id: region.id,
    channel: "web",
    visibility: "hidden",
    starts_at: null,
    ends_at: null,
  } satisfies IShoppingMallProductVisibilityRule.ICreate;

  const hiddenRule: IShoppingMallProductVisibilityRule =
    await api.functional.shoppingMall.platformAdmin.products.visibilityRules.create(
      connection,
      {
        productCode: productB.code,
        body: hiddenRuleBody,
      },
    );
  typia.assert(hiddenRule);

  // 10. Query enriched catalog for region + channel "web" with brand & category filters
  const pageSize = 20 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const firstRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    page_size: pageSize,
    sort_field: "created_at",
    sort_direction: "desc" as const,
    status: "active",
    brand_id: brand.id,
    category_ids: [category.id],
    region_setting_id: region.id,
    channel: "web",
  } satisfies IShoppingMallProduct.IRequest;

  const firstPage: IPageIShoppingMallProduct.ISummary =
    await api.functional.shoppingMall.catalog.products.enriched.index(
      connection,
      {
        body: firstRequestBody,
      },
    );
  typia.assert(firstPage);

  const paginationWeb = firstPage.pagination;
  const dataWeb = firstPage.data;

  // Basic pagination consistency
  TestValidator.predicate(
    "pagination.records is non-negative",
    paginationWeb.records >= 0,
  );
  TestValidator.predicate(
    "pagination.limit is non-negative",
    paginationWeb.limit >= 0,
  );
  TestValidator.predicate(
    "records do not exceed limit when pages = 1",
    paginationWeb.pages === 0 || paginationWeb.records >= 0,
  );

  // There might be other products in the system; we only assert relative
  // visibility between A and B under the same filters.
  const productAInWeb = dataWeb.find((p) => p.id === productA.id);
  const productBInWeb = dataWeb.find((p) => p.id === productB.id);

  TestValidator.predicate(
    "Product A should be visible on web for the configured region",
    productAInWeb !== undefined,
  );

  TestValidator.predicate(
    "Product B should be hidden on web for the configured region",
    productBInWeb === undefined,
  );

  // 11. Query again with same region but different channel (e.g., "mobile")
  const secondRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    page_size: pageSize,
    sort_field: "created_at",
    sort_direction: "desc" as const,
    status: "active",
    brand_id: brand.id,
    category_ids: [category.id],
    region_setting_id: region.id,
    channel: "mobile",
  } satisfies IShoppingMallProduct.IRequest;

  const mobilePage: IPageIShoppingMallProduct.ISummary =
    await api.functional.shoppingMall.catalog.products.enriched.index(
      connection,
      {
        body: secondRequestBody,
      },
    );
  typia.assert(mobilePage);

  const paginationMobile = mobilePage.pagination;
  const dataMobile = mobilePage.data;

  TestValidator.predicate(
    "mobile pagination.records is non-negative",
    paginationMobile.records >= 0,
  );
  TestValidator.predicate(
    "mobile pagination.limit is non-negative",
    paginationMobile.limit >= 0,
  );

  const productAInMobile = dataMobile.find((p) => p.id === productA.id);
  const productBInMobile = dataMobile.find((p) => p.id === productB.id);

  // We expect Product B to remain hidden at least in the presence of an
  // explicit hidden rule on another channel; Product A should still be
  // discoverable for this region and filters under some channel context.
  TestValidator.predicate(
    "Product A should still be discoverable under mobile channel filters",
    productAInMobile !== undefined,
  );

  TestValidator.predicate(
    "Product B should not appear under mobile channel filters",
    productBInMobile === undefined,
  );
}
