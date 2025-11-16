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

/**
 * Validate that a platform administrator can update an existing
 * product–category assignment to mark it as primary and adjust assignment
 * metadata.
 *
 * Business flow implemented:
 *
 * 1. Register and authenticate a platform admin (join).
 * 2. Create a category tree configuration.
 * 3. Create two categories (A and B) under that tree.
 * 4. Create a brand.
 * 5. Create a product bound to the brand and a random seller id.
 * 6. Assign Category A to the product as primary.
 * 7. Assign Category B to the product as non‑primary.
 * 8. Update the Category B assignment to become primary and adjust metadata.
 * 9. Validate that the updated assignment reflects the requested changes
 *    (is_primary=true, same product/category linkage, same id, updated
 *    timestamps where observable).
 */
export async function test_api_platform_admin_updates_primary_category_assignment_for_product(
  connection: api.IConnection,
) {
  // 1. Platform admin joins (establishes platformAdmin auth context)
  const adminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@admin.test`,
    name: RandomGenerator.name(2),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://admin.test/join",
    referrer: "https://admin.test/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Create a category tree
  const treeBody = {
    code: `tree-${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const tree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      { body: treeBody },
    );
  typia.assert(tree);

  // 3. Create two categories (A and B) under the tree
  const categoryACode = `cat-a-${RandomGenerator.alphaNumeric(6)}`;
  const categoryAInput = {
    code: categoryACode,
    name: "Category A",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    displayOrder: 1 as number & tags.Type<"int32">,
    isActive: true,
  } satisfies IShoppingMallCategory.ICreate;

  const categoryA: IShoppingMallCategory =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.categories.create(
      connection,
      {
        categoryTreeCode: tree.code,
        body: categoryAInput,
      },
    );
  typia.assert(categoryA);

  const categoryBCode = `cat-b-${RandomGenerator.alphaNumeric(6)}`;
  const categoryBInput = {
    code: categoryBCode,
    name: "Category B",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    displayOrder: 2 as number & tags.Type<"int32">,
    isActive: true,
  } satisfies IShoppingMallCategory.ICreate;

  const categoryB: IShoppingMallCategory =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.categories.create(
      connection,
      {
        categoryTreeCode: tree.code,
        body: categoryBInput,
      },
    );
  typia.assert(categoryB);

  // 4. Create a brand
  const brandBody = {
    name: `Brand ${RandomGenerator.paragraph({ sentences: 1 })}`,
    slug: `brand-${RandomGenerator.alphaNumeric(10)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_uri: "https://cdn.test/logo.png" as string & tags.Format<"uri">,
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  // 5. Create a product associated with a random seller and the brand
  const productBody = {
    shopping_mall_seller_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_brand_id: brand.id,
    code: `prod-${RandomGenerator.alphaNumeric(10)}` as string &
      tags.MinLength<1>,
    name: `Product ${RandomGenerator.paragraph({ sentences: 1 })}` as string &
      tags.MinLength<1>,
    short_description: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: false,
    primary_image_uri: "https://cdn.test/product.png" as string &
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
  typia.assert(product);

  // 6. Create initial primary assignment for Category A
  const assignmentABody = {
    shopping_mall_category_id: categoryA.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategoryAssignment.ICreate;

  const assignmentA: IShoppingMallProductCategoryAssignment =
    await api.functional.shoppingMall.platformAdmin.products.categories.create(
      connection,
      {
        productCode: product.code,
        body: assignmentABody,
      },
    );
  typia.assert(assignmentA);

  // 7. Create secondary assignment for Category B (non-primary)
  const assignmentBBody = {
    shopping_mall_category_id: categoryB.id,
    is_primary: false,
  } satisfies IShoppingMallProductCategoryAssignment.ICreate;

  const assignmentBOriginal: IShoppingMallProductCategoryAssignment =
    await api.functional.shoppingMall.platformAdmin.products.categories.create(
      connection,
      {
        productCode: product.code,
        body: assignmentBBody,
      },
    );
  typia.assert(assignmentBOriginal);

  // Keep original updated_at for later comparison
  const originalUpdatedAt = assignmentBOriginal.updated_at;

  // 8. Update Category B assignment to become primary and adjust metadata
  const now = new Date();
  const activeFrom = now.toISOString() as string & tags.Format<"date-time">;
  const activeUntil = new Date(
    now.getTime() + 60 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;

  const updateBody = {
    isPrimary: true,
    sortOrder: 10 as number & tags.Type<"int32">,
    isVisibleInNavigation: true,
    isVisibleInSearch: true,
    activeFrom,
    activeUntil,
  } satisfies IShoppingMallProductCategoryAssignment.IUpdate;

  const updatedAssignment: IShoppingMallProductCategoryAssignment =
    await api.functional.shoppingMall.platformAdmin.products.categories.update(
      connection,
      {
        productCode: product.code,
        productCategoryAssignmentId: assignmentBOriginal.id,
        body: updateBody,
      },
    );
  typia.assert(updatedAssignment);

  // 9. Validate updated assignment fields
  TestValidator.equals(
    "updated assignment id should match original Category B assignment id",
    updatedAssignment.id,
    assignmentBOriginal.id,
  );

  TestValidator.equals(
    "updated assignment product should still be the created product",
    updatedAssignment.product.id,
    product.id,
  );

  TestValidator.equals(
    "updated assignment should now be primary",
    updatedAssignment.is_primary,
    true,
  );

  // Ensure category linkage did not change
  TestValidator.equals(
    "updated assignment should still point to Category B",
    updatedAssignment.category.id,
    assignmentBOriginal.category.id,
  );

  // 10. Confirm updated_at changed
  TestValidator.notEquals(
    "updated_at should change after update",
    updatedAssignment.updated_at,
    originalUpdatedAt,
  );
}
