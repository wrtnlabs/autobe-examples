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

export async function test_api_catalog_enriched_products_pagination_and_sorting(
  connection: api.IConnection,
) {
  // 1. Join as platform admin to obtain authorized context
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    name: RandomGenerator.name(),
    password: "P@ssw0rd!",
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Create a region setting
  const regionCreateBody = {
    code: `REG-${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    iso_country_code: "US",
    currency_code: "USD",
    timezone: "America/New_York",
    active: true,
  } satisfies IShoppingMallRegionSetting.ICreate;

  const region: IShoppingMallRegionSetting =
    await api.functional.shoppingMall.platformAdmin.regionSettings.create(
      connection,
      { body: regionCreateBody },
    );
  typia.assert(region);

  // 3. Create a category tree and a single active category
  const categoryTreeCreateBody = {
    code: `TREE-${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      { body: categoryTreeCreateBody },
    );
  typia.assert(categoryTree);

  const categoryCreateBody = {
    code: `CAT-${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
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
        body: categoryCreateBody,
      },
    );
  typia.assert(category);

  // 4. Create a brand shared by all test products
  const brandCreateBody = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    slug: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_uri: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 5. Create three products (P1, P2, P3) with deterministic sortable names
  const sharedSellerId = typia.random<string & tags.Format<"uuid">>();
  const channel = "web";

  const createProduct = async (
    code: string,
    namePrefix: string,
  ): Promise<IShoppingMallProduct> => {
    const productCreateBody = {
      shopping_mall_seller_id: sharedSellerId,
      shopping_mall_brand_id: brand.id,
      code,
      name: `${namePrefix}-${RandomGenerator.name(1)}`,
      short_description: RandomGenerator.paragraph({ sentences: 2 }),
      description: RandomGenerator.content({ paragraphs: 2 }),
      status: "active",
      is_multi_sku: false,
      primary_image_uri: typia.random<string & tags.Format<"uri">>(),
      additional_data: null,
    } satisfies IShoppingMallProduct.ICreate;

    const product: IShoppingMallProduct =
      await api.functional.shoppingMall.platformAdmin.products.create(
        connection,
        { body: productCreateBody },
      );
    typia.assert(product);
    return product;
  };

  const product1 = await createProduct("P1-CODE", "AAA");
  const product2 = await createProduct("P2-CODE", "MMM");
  const product3 = await createProduct("P3-CODE", "ZZZ");

  // 6. Assign all products to the same primary category
  const assignCategory = async (
    product: IShoppingMallProduct,
  ): Promise<IShoppingMallProductCategoryAssignment> => {
    const assignmentBody = {
      shopping_mall_category_id: category.id,
      is_primary: true,
    } satisfies IShoppingMallProductCategoryAssignment.ICreate;

    const assignment: IShoppingMallProductCategoryAssignment =
      await api.functional.shoppingMall.platformAdmin.products.categories.create(
        connection,
        {
          productCode: product.code,
          body: assignmentBody,
        },
      );
    typia.assert(assignment);
    return assignment;
  };

  await assignCategory(product1);
  await assignCategory(product2);
  await assignCategory(product3);

  // 7. Create visibility rules for all products in the same region and channel
  const nowIso = new Date().toISOString();
  const createVisibility = async (
    product: IShoppingMallProduct,
  ): Promise<IShoppingMallProductVisibilityRule> => {
    const visibilityBody = {
      shopping_mall_region_setting_id: region.id,
      channel,
      visibility: "visible",
      starts_at: nowIso,
      ends_at: null,
    } satisfies IShoppingMallProductVisibilityRule.ICreate;

    const rule: IShoppingMallProductVisibilityRule =
      await api.functional.shoppingMall.platformAdmin.products.visibilityRules.create(
        connection,
        {
          productCode: product.code,
          body: visibilityBody,
        },
      );
    typia.assert(rule);
    return rule;
  };

  await createVisibility(product1);
  await createVisibility(product2);
  await createVisibility(product3);

  // Helper to call enriched catalog index
  const pageSize = 2 as number & tags.Type<"int32"> & tags.Minimum<1>;

  const searchEnriched = async (
    page: number & tags.Type<"int32"> & tags.Minimum<1>,
    sortDirection: "asc" | "desc",
  ): Promise<IPageIShoppingMallProduct.ISummary> => {
    const requestBody = {
      page,
      page_size: pageSize,
      sort_field: "name",
      sort_direction: sortDirection,
      status: "active",
      brand_id: brand.id,
      category_ids: [category.id],
      region_setting_id: region.id,
      channel,
    } satisfies IShoppingMallProduct.IRequest;

    const pageResult: IPageIShoppingMallProduct.ISummary =
      await api.functional.shoppingMall.catalog.products.enriched.index(
        connection,
        { body: requestBody },
      );
    typia.assert(pageResult);
    return pageResult;
  };

  // 8. Query page 1 with ascending sort
  const ascPage1 = await searchEnriched(
    1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    "asc",
  );
  const ascPage1Pagination = ascPage1.pagination;

  TestValidator.predicate(
    "pagination.records should be at least 3",
    ascPage1Pagination.records >= 3,
  );
  TestValidator.predicate(
    "pagination.pages should be at least 2",
    ascPage1Pagination.pages >= 2,
  );
  TestValidator.equals(
    "page1 should contain exactly pageSize items",
    ascPage1.data.length,
    pageSize,
  );

  const page1Ids = ascPage1.data.map((p) => p.id);
  const page1Names = ascPage1.data.map((p) => p.name);

  // 9. Query page 2 with ascending sort
  const ascPage2 = await searchEnriched(
    2 as number & tags.Type<"int32"> & tags.Minimum<1>,
    "asc",
  );
  const ascPage2Pagination = ascPage2.pagination;

  TestValidator.equals(
    "pagination.records should be consistent between page1 and page2 (asc)",
    ascPage2Pagination.records,
    ascPage1Pagination.records,
  );
  TestValidator.equals(
    "pagination.pages should be consistent between page1 and page2 (asc)",
    ascPage2Pagination.pages,
    ascPage1Pagination.pages,
  );

  TestValidator.predicate(
    "page2 should contain at least 1 item",
    ascPage2.data.length >= 1,
  );

  const page2Ids = ascPage2.data.map((p) => p.id);
  const page2Names = ascPage2.data.map((p) => p.name);

  // 10. Assert no overlap between page 1 and page 2 products
  const overlap = page1Ids.some((id) => page2Ids.includes(id));
  TestValidator.predicate(
    "page1 and page2 should have no overlapping product IDs",
    overlap === false,
  );

  // 11. Assert ascending ordering across both pages
  const combinedAscNames = [...page1Names, ...page2Names];
  const sortedAscNames = [...combinedAscNames].sort((a, b) =>
    a.localeCompare(b),
  );

  TestValidator.equals(
    "combined ascending names across pages should be sorted lexicographically",
    combinedAscNames,
    sortedAscNames,
  );

  // 12. Optional: repeat with descending sort and verify reverse order
  const descPage1 = await searchEnriched(
    1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    "desc",
  );
  const descPage2 = await searchEnriched(
    2 as number & tags.Type<"int32"> & tags.Minimum<1>,
    "desc",
  );

  const descPage1Pagination = descPage1.pagination;
  const descPage2Pagination = descPage2.pagination;

  TestValidator.equals(
    "pagination.records should match between asc and desc (page1)",
    descPage1Pagination.records,
    ascPage1Pagination.records,
  );
  TestValidator.equals(
    "pagination.pages should match between asc and desc (page1)",
    descPage1Pagination.pages,
    ascPage1Pagination.pages,
  );
  TestValidator.equals(
    "pagination.records should match between asc and desc (page2)",
    descPage2Pagination.records,
    ascPage1Pagination.records,
  );
  TestValidator.equals(
    "pagination.pages should match between asc and desc (page2)",
    descPage2Pagination.pages,
    ascPage1Pagination.pages,
  );

  const combinedDescNames = [
    ...descPage1.data.map((p) => p.name),
    ...descPage2.data.map((p) => p.name),
  ];
  const expectedDescNames = [...sortedAscNames].reverse();

  // Because additional matching products may exist beyond the three we created,
  // we only compare ordering for the slice that matches the length of
  // combinedDescNames when both lengths are equal; otherwise, ensure that
  // combinedDescNames is sorted in descending order by itself.
  if (combinedDescNames.length === expectedDescNames.length) {
    TestValidator.equals(
      "combined descending names should be exact reverse of ascending names",
      combinedDescNames,
      expectedDescNames,
    );
  } else {
    const sortedDescSelf = [...combinedDescNames].sort((a, b) =>
      b.localeCompare(a),
    );
    TestValidator.equals(
      "combined descending names should be sorted in descending order",
      combinedDescNames,
      sortedDescSelf,
    );
  }
}
