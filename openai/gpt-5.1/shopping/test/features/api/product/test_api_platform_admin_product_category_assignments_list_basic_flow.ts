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

export async function test_api_platform_admin_product_category_assignments_list_basic_flow(
  connection: api.IConnection,
) {
  // 1. Register a platform admin and establish authenticated context
  const joinBody = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Create a category tree
  const treeCode = `tree-${RandomGenerator.alphaNumeric(8)}`;
  const categoryTreeBody = {
    code: treeCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      { body: categoryTreeBody },
    );
  typia.assert<IShoppingMallCategoryTree>(categoryTree);

  // 3. Create two categories under that tree
  const categoryABody = {
    code: `cat-a-${RandomGenerator.alphaNumeric(6)}`,
    name: "Category A",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    displayOrder: 1,
    isActive: true,
  } satisfies IShoppingMallCategory.ICreate;

  const categoryBBody = {
    code: `cat-b-${RandomGenerator.alphaNumeric(6)}`,
    name: "Category B",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    displayOrder: 2,
    isActive: true,
  } satisfies IShoppingMallCategory.ICreate;

  const categoryA: IShoppingMallCategory =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.categories.create(
      connection,
      {
        categoryTreeCode: categoryTree.code,
        body: categoryABody,
      },
    );
  typia.assert<IShoppingMallCategory>(categoryA);

  const categoryB: IShoppingMallCategory =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.categories.create(
      connection,
      {
        categoryTreeCode: categoryTree.code,
        body: categoryBBody,
      },
    );
  typia.assert<IShoppingMallCategory>(categoryB);

  // 4. Create a brand
  const brandBody = {
    name: `Brand ${RandomGenerator.paragraph({ sentences: 1 })}`,
    slug: `brand-${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 4 }),
    logo_uri: "https://cdn.example.com/logo.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert<IShoppingMallBrand>(brand);

  // 5. Create a product associated with the brand
  const productCode = `prod-${RandomGenerator.alphaNumeric(10)}`;
  const productBody = {
    shopping_mall_seller_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: false,
    primary_image_uri: "https://cdn.example.com/product.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      { body: productBody },
    );
  typia.assert<IShoppingMallProduct>(product);

  // 6. Create two product-category assignments
  const primaryAssignmentBody = {
    shopping_mall_category_id: categoryA.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategoryAssignment.ICreate;

  const secondaryAssignmentBody = {
    shopping_mall_category_id: categoryB.id,
    is_primary: false,
  } satisfies IShoppingMallProductCategoryAssignment.ICreate;

  const assignmentPrimary: IShoppingMallProductCategoryAssignment =
    await api.functional.shoppingMall.platformAdmin.products.categories.create(
      connection,
      {
        productCode: product.code,
        body: primaryAssignmentBody,
      },
    );
  typia.assert<IShoppingMallProductCategoryAssignment>(assignmentPrimary);

  const assignmentSecondary: IShoppingMallProductCategoryAssignment =
    await api.functional.shoppingMall.platformAdmin.products.categories.create(
      connection,
      {
        productCode: product.code,
        body: secondaryAssignmentBody,
      },
    );
  typia.assert<IShoppingMallProductCategoryAssignment>(assignmentSecondary);

  // 7. List assignments for this product with minimal request body
  const listBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallProductCategoryAssignment.IRequest;

  const pageResult: IPageIShoppingMallProductCategoryAssignment.ISummary =
    await api.functional.shoppingMall.platformAdmin.products.categories.index(
      connection,
      {
        productCode: product.code,
        body: listBody,
      },
    );
  typia.assert<IPageIShoppingMallProductCategoryAssignment.ISummary>(
    pageResult,
  );

  const pagination: IPage.IPagination = pageResult.pagination;
  typia.assert<IPage.IPagination>(pagination);

  // 8. Basic pagination validations
  TestValidator.predicate(
    "pagination.records should be at least number of created assignments",
    pagination.records >= 2,
  );
  TestValidator.predicate(
    "pagination.pages should be at least 1 when records exist",
    pagination.records === 0 ? pagination.pages === 0 : pagination.pages >= 1,
  );
  TestValidator.predicate(
    "pagination.limit should be >= number of returned records",
    pagination.limit >= pageResult.data.length,
  );

  // 9. Validate that both created assignments appear and product/category info matches
  const matchingAssignments = pageResult.data.filter((summary) => {
    return (
      summary.product.id === product.id &&
      (summary.category.id === categoryA.id ||
        summary.category.id === categoryB.id)
    );
  });

  TestValidator.predicate(
    "response must contain both created category assignments for the product",
    matchingAssignments.length >= 2,
  );

  // Map for easier checks
  const byCategoryId: Record<
    string,
    IShoppingMallProductCategoryAssignment.ISummary
  > = {};
  for (const item of matchingAssignments) {
    byCategoryId[item.category.id] = item;
  }

  const summaryA = byCategoryId[categoryA.id];
  const summaryB = byCategoryId[categoryB.id];

  TestValidator.predicate(
    "primary category assignment for Category A should exist",
    !!summaryA,
  );
  TestValidator.predicate(
    "secondary category assignment for Category B should exist",
    !!summaryB,
  );

  if (summaryA) {
    TestValidator.equals(
      "primary assignment product id should match created product",
      summaryA.product.id,
      product.id,
    );
    if (product.brand) {
      TestValidator.predicate(
        "primary assignment product brand should exist when product has brand",
        !!summaryA.product.brand,
      );
      if (summaryA.product.brand) {
        TestValidator.equals(
          "primary assignment product brand id should match created brand id",
          summaryA.product.brand.id,
          product.brand.id,
        );
      }
    }
    TestValidator.equals(
      "primary assignment category id should match Category A id",
      summaryA.category.id,
      categoryA.id,
    );
    TestValidator.equals(
      "primary assignment category code should match Category A code",
      summaryA.category.code,
      categoryA.code,
    );
    TestValidator.equals(
      "primary assignment isPrimary flag should be true",
      summaryA.isPrimary,
      true,
    );
  }

  if (summaryB) {
    TestValidator.equals(
      "secondary assignment product id should match created product",
      summaryB.product.id,
      product.id,
    );
    TestValidator.equals(
      "secondary assignment category id should match Category B id",
      summaryB.category.id,
      categoryB.id,
    );
    TestValidator.equals(
      "secondary assignment category code should match Category B code",
      summaryB.category.code,
      categoryB.code,
    );
    TestValidator.equals(
      "secondary assignment isPrimary flag should be false",
      summaryB.isPrimary,
      false,
    );
  }

  // Validate that exactly one assignment in the whole data set for this product is primary
  const productAssignments = pageResult.data.filter(
    (summary) => summary.product.id === product.id,
  );
  const primaryCount = productAssignments.filter((s) => s.isPrimary).length;
  TestValidator.equals(
    "exactly one primary assignment should exist for the product",
    primaryCount,
    1,
  );
}
