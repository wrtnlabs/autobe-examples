import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryTree";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategoryAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategoryAssignment";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_platform_admin_delete_assignment_with_mismatched_product_returns_not_found(
  connection: api.IConnection,
) {
  // 1. Join as platform admin to enable platformAdmin endpoints
  const adminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Create a category tree
  const categoryTreeBody = {
    code: `tree-${RandomGenerator.alphabets(8)}`,
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
  typia.assert(categoryTree);

  // 3. Create a category under the tree
  const categoryBody = {
    code: `cat-${RandomGenerator.alphabets(8)}`,
    name: "Test Category",
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
  typia.assert(category);

  // 4. Create a brand used by products
  const brandBody = {
    name: `Brand ${RandomGenerator.name(1)}`,
    slug: `brand-${RandomGenerator.alphabets(10)}`,
    description: RandomGenerator.paragraph({ sentences: 4 }),
    logo_uri: "https://cdn.example.com/logo.png" as string & tags.Format<"uri">,
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  // 5. Create two products (A and B) under the same seller and brand
  const sellerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const productACode = `prod-A-${RandomGenerator.alphabets(6)}`;
  const productBCode = `prod-B-${RandomGenerator.alphabets(6)}`;

  const productABody = {
    shopping_mall_seller_id: sellerId,
    shopping_mall_brand_id: brand.id,
    code: productACode as string & tags.MinLength<1>,
    name: `Product A ${RandomGenerator.name(1)}` as string & tags.MinLength<1>,
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: false,
    primary_image_uri: "https://cdn.example.com/product-a.png" as string &
      tags.Format<"uri">,
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const productA: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      {
        body: productABody,
      },
    );
  typia.assert(productA);

  const productBBody = {
    shopping_mall_seller_id: sellerId,
    shopping_mall_brand_id: brand.id,
    code: productBCode as string & tags.MinLength<1>,
    name: `Product B ${RandomGenerator.name(1)}` as string & tags.MinLength<1>,
    short_description: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: false,
    primary_image_uri: "https://cdn.example.com/product-b.png" as string &
      tags.Format<"uri">,
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const productB: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      {
        body: productBBody,
      },
    );
  typia.assert(productB);

  // Sanity check that codes are distinct
  TestValidator.notEquals(
    "product A and B codes must differ",
    productA.code,
    productB.code,
  );

  // 6. Create a category assignment for product A
  const assignmentBody = {
    shopping_mall_category_id: category.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategoryAssignment.ICreate;

  const assignmentForA: IShoppingMallProductCategoryAssignment =
    await api.functional.shoppingMall.platformAdmin.products.categories.create(
      connection,
      {
        productCode: productA.code,
        body: assignmentBody,
      },
    );
  typia.assert(assignmentForA);

  // 7. Try to delete the assignment using product B's code
  await TestValidator.error(
    "deleting assignment with mismatched product must fail with not-found style error",
    async () => {
      await api.functional.shoppingMall.platformAdmin.products.categories.erase(
        connection,
        {
          productCode: productB.code,
          productCategoryAssignmentId: assignmentForA.id,
        },
      );
    },
  );

  // 8. Verify that assignment for product A is still valid by creating another assignment
  //    as primary=false (or toggling), just to ensure the product/category relation is still usable.
  const subsequentAssignmentBody = {
    shopping_mall_category_id: category.id,
    is_primary: false,
  } satisfies IShoppingMallProductCategoryAssignment.ICreate;

  const subsequentAssignment: IShoppingMallProductCategoryAssignment =
    await api.functional.shoppingMall.platformAdmin.products.categories.create(
      connection,
      {
        productCode: productA.code,
        body: subsequentAssignmentBody,
      },
    );
  typia.assert(subsequentAssignment);

  // Ensure the new assignment is for the same product and category
  TestValidator.equals(
    "subsequent assignment product should match product A",
    subsequentAssignment.product.id,
    assignmentForA.product.id,
  );
  TestValidator.equals(
    "subsequent assignment category should match original category",
    subsequentAssignment.category.id,
    assignmentForA.category.id,
  );
}
