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
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategoryAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategoryAssignment";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";

export async function test_api_seller_product_category_assignments_filtering_by_primary_and_tree(
  connection: api.IConnection,
) {
  // 1. Create seller account (join) and keep its id and email/password
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  const sellerEmail = sellerAuthorized.email;
  const sellerPassword = sellerJoinBody.password;

  // 2. Create platform admin account (join) and keep its email/password
  const platformAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(2),
    password: RandomGenerator.alphaNumeric(12),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  const platformAdminEmail = platformAdminAuthorized.email;
  const platformAdminPassword = platformAdminJoinBody.password;

  // 3. Login as platform admin explicitly to ensure admin context (token handled by SDK)
  const platformAdminLoginBody = {
    email: platformAdminEmail,
    password: platformAdminPassword,
    ip: "127.0.0.1",
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const platformAdminLogin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLogin);

  // 4. Create two category trees as platform admin
  const mainTreeCode = `MAIN_${RandomGenerator.alphaNumeric(8)}`;
  const secondTreeCode = `SECOND_${RandomGenerator.alphaNumeric(8)}`;

  const mainTreeCreateBody = {
    code: mainTreeCode,
    name: "Main Category Tree",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const mainTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      { body: mainTreeCreateBody },
    );
  typia.assert(mainTree);

  const secondTreeCreateBody = {
    code: secondTreeCode,
    name: "Second Category Tree",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const secondTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      { body: secondTreeCreateBody },
    );
  typia.assert(secondTree);

  // 5. Under each tree, create categories (main: primary + secondary; second: secondary only)
  const mainPrimaryCategoryBody = {
    code: `MAIN_PRIMARY_${RandomGenerator.alphaNumeric(6)}`,
    name: "Main Primary Category",
    description: RandomGenerator.paragraph({ sentences: 2 }),
    displayOrder: 1 as number & tags.Type<"int32">,
    isActive: true,
    parentCategoryCode: undefined,
  } satisfies IShoppingMallCategory.ICreate;

  const mainPrimaryCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.categories.create(
      connection,
      {
        categoryTreeCode: mainTree.code,
        body: mainPrimaryCategoryBody,
      },
    );
  typia.assert(mainPrimaryCategory);

  const mainSecondaryCategoryBody = {
    code: `MAIN_SECONDARY_${RandomGenerator.alphaNumeric(6)}`,
    name: "Main Secondary Category",
    description: RandomGenerator.paragraph({ sentences: 2 }),
    displayOrder: 2 as number & tags.Type<"int32">,
    isActive: true,
    parentCategoryCode: undefined,
  } satisfies IShoppingMallCategory.ICreate;

  const mainSecondaryCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.categories.create(
      connection,
      {
        categoryTreeCode: mainTree.code,
        body: mainSecondaryCategoryBody,
      },
    );
  typia.assert(mainSecondaryCategory);

  const secondTreeCategoryBody = {
    code: `SECOND_${RandomGenerator.alphaNumeric(6)}`,
    name: "Second Tree Category",
    description: RandomGenerator.paragraph({ sentences: 2 }),
    displayOrder: 1 as number & tags.Type<"int32">,
    isActive: true,
    parentCategoryCode: undefined,
  } satisfies IShoppingMallCategory.ICreate;

  const secondTreeCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.categories.create(
      connection,
      {
        categoryTreeCode: secondTree.code,
        body: secondTreeCategoryBody,
      },
    );
  typia.assert(secondTreeCategory);

  // Optional: create an inactive category (will not be assigned in this test, but can validate activeOnly behavior)
  const inactiveCategoryBody = {
    code: `MAIN_INACTIVE_${RandomGenerator.alphaNumeric(6)}`,
    name: "Main Inactive Category",
    description: RandomGenerator.paragraph({ sentences: 2 }),
    displayOrder: 3 as number & tags.Type<"int32">,
    isActive: false,
    parentCategoryCode: undefined,
  } satisfies IShoppingMallCategory.ICreate;

  const inactiveCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.categories.create(
      connection,
      {
        categoryTreeCode: mainTree.code,
        body: inactiveCategoryBody,
      },
    );
  typia.assert(inactiveCategory);

  // 6. Create a product owned by the seller via platformAdmin.products.create
  const productCode = `PROD_${RandomGenerator.alphaNumeric(10)}`;

  const productCreateBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: undefined,
    code: productCode as string & tags.MinLength<1>,
    name: RandomGenerator.name(2) as string & tags.MinLength<1>,
    short_description: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: false,
    primary_image_uri: undefined,
    additional_data: undefined,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      {
        body: productCreateBody,
      },
    );
  typia.assert(product);

  // 7. Create product-category assignments via platformAdmin.products.categories.create
  // Primary assignment in MAIN tree
  const primaryAssignmentBody = {
    shopping_mall_category_id: mainPrimaryCategory.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategoryAssignment.ICreate;

  const primaryAssignment: IShoppingMallProductCategoryAssignment =
    await api.functional.shoppingMall.platformAdmin.products.categories.create(
      connection,
      {
        productCode: product.code,
        body: primaryAssignmentBody,
      },
    );
  typia.assert(primaryAssignment);

  // Secondary assignment in MAIN tree
  const mainSecondaryAssignmentBody = {
    shopping_mall_category_id: mainSecondaryCategory.id,
    is_primary: false,
  } satisfies IShoppingMallProductCategoryAssignment.ICreate;

  const mainSecondaryAssignment: IShoppingMallProductCategoryAssignment =
    await api.functional.shoppingMall.platformAdmin.products.categories.create(
      connection,
      {
        productCode: product.code,
        body: mainSecondaryAssignmentBody,
      },
    );
  typia.assert(mainSecondaryAssignment);

  // Secondary assignment in SECOND tree
  const secondTreeAssignmentBody = {
    shopping_mall_category_id: secondTreeCategory.id,
    is_primary: false,
  } satisfies IShoppingMallProductCategoryAssignment.ICreate;

  const secondTreeAssignment: IShoppingMallProductCategoryAssignment =
    await api.functional.shoppingMall.platformAdmin.products.categories.create(
      connection,
      {
        productCode: product.code,
        body: secondTreeAssignmentBody,
      },
    );
  typia.assert(secondTreeAssignment);

  // Optional: secondary assignment to inactive category (is_primary=false)
  const inactiveAssignmentBody = {
    shopping_mall_category_id: inactiveCategory.id,
    is_primary: false,
  } satisfies IShoppingMallProductCategoryAssignment.ICreate;

  const inactiveAssignment: IShoppingMallProductCategoryAssignment =
    await api.functional.shoppingMall.platformAdmin.products.categories.create(
      connection,
      {
        productCode: product.code,
        body: inactiveAssignmentBody,
      },
    );
  typia.assert(inactiveAssignment);

  // 8. Login as seller to use seller-facing listing endpoint
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: "127.0.0.1",
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/",
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogin);

  // Helper to assert all categories belong to a given tree code
  const assertAllAssignmentsCategoryTreeCode = (
    title: string,
    page: IPageIShoppingMallProductCategoryAssignment.ISummary,
    expectedTreeCode: string,
  ) => {
    const allCodes = page.data.map(
      (assignment) => assignment.category.categoryTree.code,
    );
    TestValidator.predicate(title, () =>
      allCodes.every((code) => code === expectedTreeCode),
    );
  };

  // Helper to assert all categories are active
  const assertAllAssignmentsActive = (
    title: string,
    page: IPageIShoppingMallProductCategoryAssignment.ISummary,
  ) => {
    const allActiveFlags = page.data.map(
      (assignment) => assignment.category.active,
    );
    TestValidator.predicate(title, () =>
      allActiveFlags.every((flag) => flag === true),
    );
  };

  // A. Primary-only filter: isPrimaryOnly=true, no categoryTreeCode
  const primaryOnlyRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    isPrimaryOnly: true,
  } satisfies IShoppingMallProductCategoryAssignment.IRequest;

  const primaryOnlyPage: IPageIShoppingMallProductCategoryAssignment.ISummary =
    await api.functional.shoppingMall.seller.products.categories.index(
      connection,
      {
        productCode: product.code,
        body: primaryOnlyRequestBody,
      },
    );
  typia.assert(primaryOnlyPage);

  TestValidator.equals(
    "primary-only filter: exactly one record in pagination",
    primaryOnlyPage.pagination.records,
    1,
  );
  TestValidator.equals(
    "primary-only filter: exactly one assignment in data",
    primaryOnlyPage.data.length,
    1,
  );

  const primaryOnlyAssignment = primaryOnlyPage.data[0];
  TestValidator.predicate(
    "primary-only filter: assignment isPrimary is true",
    primaryOnlyAssignment.isPrimary === true,
  );
  TestValidator.equals(
    "primary-only filter: assignment product id matches",
    primaryOnlyAssignment.product.id,
    product.id,
  );

  // B. Tree-scoped filter: isPrimaryOnly=false, categoryTreeCode = mainTree.code
  const mainTreeRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    isPrimaryOnly: false,
    categoryTreeCode: mainTree.code as string & tags.MinLength<1>,
  } satisfies IShoppingMallProductCategoryAssignment.IRequest;

  const mainTreePage: IPageIShoppingMallProductCategoryAssignment.ISummary =
    await api.functional.shoppingMall.seller.products.categories.index(
      connection,
      {
        productCode: product.code,
        body: mainTreeRequestBody,
      },
    );
  typia.assert(mainTreePage);

  // We expect three assignments in main tree: primary, secondary and inactive
  const expectedMainTreeCount = 3;

  TestValidator.equals(
    "tree-scoped filter: pagination.records equals number of main-tree assignments",
    mainTreePage.pagination.records,
    expectedMainTreeCount,
  );
  TestValidator.equals(
    "tree-scoped filter: data.length equals number of main-tree assignments",
    mainTreePage.data.length,
    expectedMainTreeCount,
  );

  assertAllAssignmentsCategoryTreeCode(
    "tree-scoped filter: all assignments belong to main tree",
    mainTreePage,
    mainTree.code,
  );

  // C. Active-only filter: activeOnly=true (no tree or primary filter)
  const activeOnlyRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    activeOnly: true,
  } satisfies IShoppingMallProductCategoryAssignment.IRequest;

  const activeOnlyPage: IPageIShoppingMallProductCategoryAssignment.ISummary =
    await api.functional.shoppingMall.seller.products.categories.index(
      connection,
      {
        productCode: product.code,
        body: activeOnlyRequestBody,
      },
    );
  typia.assert(activeOnlyPage);

  // When activeOnly=true, inactive category assignments must be excluded
  assertAllAssignmentsActive(
    "active-only filter: all included categories are active",
    activeOnlyPage,
  );

  // Additionally ensure that at least one assignment is returned
  TestValidator.predicate(
    "active-only filter: at least one assignment is returned",
    activeOnlyPage.data.length > 0,
  );
}
