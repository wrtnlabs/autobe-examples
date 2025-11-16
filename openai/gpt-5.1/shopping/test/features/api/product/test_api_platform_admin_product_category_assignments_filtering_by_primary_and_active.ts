import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductCategoryAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductCategoryAssignment";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryTree";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategoryAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategoryAssignment";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate filtering of product-category assignments by primary flag and active
 * category state.
 *
 * Business context: Platform administrators need to inspect how products are
 * mapped into the catalog taxonomy and be able to filter those mappings by
 * whether a category is the primary category for a product and whether the
 * underlying category is currently active. The endpoint PATCH
 * /shoppingMall/platformAdmin/products/{productCode}/categories exposes these
 * assignments with rich filtering options.
 *
 * This test builds a realistic scenario:
 *
 * 1. A platform admin account is created (join) to obtain admin context.
 * 2. A category tree is created.
 * 3. Under that tree, multiple categories are created with mixed isActive flags
 *    (one active, one inactive at minimum).
 * 4. A brand and product are created, and category assignments are registered for
 *    the product, with exactly one assignment marked as primary and others as
 *    non-primary.
 * 5. The listing endpoint is invoked multiple times with different filter
 *    combinations to assert correct behavior:
 *
 *    - IsPrimaryOnly=true filters down to only the primary assignment.
 *    - ActiveOnly=true excludes assignments whose categories are inactive.
 *    - IsPrimaryOnly=true & activeOnly=true still returns the single primary
 *         assignment whose category is active.
 *    - An unfiltered call (no filters) returns all assignments.
 */
export async function test_api_platform_admin_product_category_assignments_filtering_by_primary_and_active(
  connection: api.IConnection,
) {
  // 1. Join as platform admin to set auth context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://landing.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create a category tree
  const treeCode = `tree-${RandomGenerator.alphaNumeric(8)}`;
  const treeCreateBody = {
    code: treeCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const tree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      { body: treeCreateBody },
    );
  typia.assert(tree);

  // 3. Create categories (one active, one inactive) in that tree
  const activeCategoryBody = {
    code: `cat-active-${RandomGenerator.alphaNumeric(6)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    displayOrder: 1 as number & tags.Type<"int32">,
    isActive: true,
    parentCategoryCode: undefined,
  } satisfies IShoppingMallCategory.ICreate;

  const inactiveCategoryBody = {
    code: `cat-inactive-${RandomGenerator.alphaNumeric(6)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    displayOrder: 2 as number & tags.Type<"int32">,
    isActive: false,
    parentCategoryCode: undefined,
  } satisfies IShoppingMallCategory.ICreate;

  const activeCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.categories.create(
      connection,
      {
        categoryTreeCode: tree.code,
        body: activeCategoryBody,
      },
    );
  typia.assert(activeCategory);

  const inactiveCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.categories.create(
      connection,
      {
        categoryTreeCode: tree.code,
        body: inactiveCategoryBody,
      },
    );
  typia.assert(inactiveCategory);

  // 4. Create a brand
  const brandCreateBody = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    slug: `brand-${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_uri: "https://cdn.example.com/logo.png" as string & tags.Format<"uri">,
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 5. Create a product
  const productCreateBody = {
    shopping_mall_seller_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_brand_id: brand.id,
    code: `prod-${RandomGenerator.alphaNumeric(10)}` as string &
      tags.MinLength<1>,
    name: RandomGenerator.paragraph({ sentences: 2 }) as string &
      tags.MinLength<1>,
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: false,
    primary_image_uri: "https://cdn.example.com/product.png" as string &
      tags.Format<"uri">,
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      { body: productCreateBody },
    );
  typia.assert(product);

  const productCode = product.code;

  // 6. Create category assignments: one primary (active category) and one non-primary (inactive category)
  const primaryAssignmentBody = {
    shopping_mall_category_id: activeCategory.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategoryAssignment.ICreate;

  const secondaryAssignmentBody = {
    shopping_mall_category_id: inactiveCategory.id,
    is_primary: false,
  } satisfies IShoppingMallProductCategoryAssignment.ICreate;

  const primaryAssignment: IShoppingMallProductCategoryAssignment =
    await api.functional.shoppingMall.platformAdmin.products.categories.create(
      connection,
      {
        productCode,
        body: primaryAssignmentBody,
      },
    );
  typia.assert(primaryAssignment);

  const secondaryAssignment: IShoppingMallProductCategoryAssignment =
    await api.functional.shoppingMall.platformAdmin.products.categories.create(
      connection,
      {
        productCode,
        body: secondaryAssignmentBody,
      },
    );
  typia.assert(secondaryAssignment);

  // Helper to assert pagination counts quickly
  const assertPaginationCounts = (
    title: string,
    page: IPageIShoppingMallProductCategoryAssignment.ISummary,
    expectedRecords: number,
  ): void => {
    TestValidator.equals(
      `${title} - records count`,
      page.pagination.records,
      expectedRecords,
    );
    TestValidator.equals(
      `${title} - data length`,
      page.data.length,
      expectedRecords,
    );
  };

  // 7. List with isPrimaryOnly=true
  const primaryOnlyPage: IPageIShoppingMallProductCategoryAssignment.ISummary =
    await api.functional.shoppingMall.platformAdmin.products.categories.index(
      connection,
      {
        productCode,
        body: {
          isPrimaryOnly: true,
        },
      },
    );
  typia.assert(primaryOnlyPage);

  assertPaginationCounts("primaryOnly", primaryOnlyPage, 1);

  const primaryResult = primaryOnlyPage.data[0];
  TestValidator.predicate(
    "primaryOnly - isPrimary flag should be true",
    primaryResult.isPrimary === true,
  );
  TestValidator.equals(
    "primaryOnly - category id should match activeCategory.id",
    primaryResult.category.id,
    activeCategory.id,
  );

  // 8. List with activeOnly=true
  const activeOnlyPage: IPageIShoppingMallProductCategoryAssignment.ISummary =
    await api.functional.shoppingMall.platformAdmin.products.categories.index(
      connection,
      {
        productCode,
        body: {
          activeOnly: true,
        },
      },
    );
  typia.assert(activeOnlyPage);

  // All returned categories should be active
  activeOnlyPage.data.forEach((assignment, index) => {
    TestValidator.predicate(
      `activeOnly - assignment[${index}] category.active should be true`,
      assignment.category.active === true,
    );
  });

  // We know at least the primary assignment is active
  TestValidator.predicate(
    "activeOnly - should have at least one assignment",
    activeOnlyPage.data.length >= 1,
  );

  // 9. List with isPrimaryOnly=true & activeOnly=true
  const combinedPage: IPageIShoppingMallProductCategoryAssignment.ISummary =
    await api.functional.shoppingMall.platformAdmin.products.categories.index(
      connection,
      {
        productCode,
        body: {
          isPrimaryOnly: true,
          activeOnly: true,
        },
      },
    );
  typia.assert(combinedPage);

  assertPaginationCounts("combined primary & active", combinedPage, 1);

  const combinedResult = combinedPage.data[0];
  TestValidator.predicate(
    "combined - isPrimary flag should be true",
    combinedResult.isPrimary === true,
  );
  TestValidator.predicate(
    "combined - category.active should be true",
    combinedResult.category.active === true,
  );
  TestValidator.equals(
    "combined - category id should match activeCategory.id",
    combinedResult.category.id,
    activeCategory.id,
  );

  // 10. Unfiltered listing to confirm all assignments are visible
  const unfilteredPage: IPageIShoppingMallProductCategoryAssignment.ISummary =
    await api.functional.shoppingMall.platformAdmin.products.categories.index(
      connection,
      {
        productCode,
        body: {},
      },
    );
  typia.assert(unfilteredPage);

  assertPaginationCounts("unfiltered", unfilteredPage, 2);

  // Ensure that both the primary (active) and secondary (inactive) category ids are present
  const categoryIds = unfilteredPage.data.map((a) => a.category.id);
  TestValidator.predicate(
    "unfiltered - should contain primaryCategory.id",
    categoryIds.includes(activeCategory.id),
  );
  TestValidator.predicate(
    "unfiltered - should contain inactiveCategory.id",
    categoryIds.includes(inactiveCategory.id),
  );
}
