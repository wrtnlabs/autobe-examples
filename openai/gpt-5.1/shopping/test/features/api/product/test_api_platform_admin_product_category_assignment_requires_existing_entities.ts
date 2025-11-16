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
 * Validate that platform admin product–category assignment requires existing
 * entities and behaves like an upsert on repeated assignment.
 *
 * Business context:
 *
 * - Platform admins can manage catalog structures globally.
 * - Products and categories live in separate tables and are linked via
 *   shopping_mall_product_category_assignments.
 * - The assignment endpoint requires both a valid product (by code) and a valid
 *   category (by id), and uniqueness of the product–category pair is enforced
 *   at the junction table.
 *
 * Steps:
 *
 * 1. Join as a platform admin (establishes admin auth context).
 * 2. Create a category tree.
 * 3. Create a category within that tree.
 * 4. Create a product.
 * 5. Assign the category to the product as primary via POST
 *    /shoppingMall/platformAdmin/products/{productCode}/categories.
 * 6. Verify product and category references and is_primary flag.
 * 7. Call the same assignment again (same product, same category, is_primary=true)
 *    and verify that the assignment id is unchanged, demonstrating upsert
 *    semantics.
 */
export async function test_api_platform_admin_product_category_assignment_requires_existing_entities(
  connection: api.IConnection,
) {
  // 1. Join as platform admin
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://admin.shoppingmall.test/join",
    referrer: "https://shoppingmall.test/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);
  TestValidator.predicate(
    "platform admin should be active",
    admin.isActive === true,
  );

  // 2. Create a category tree
  const categoryTreeCode = `tree-${RandomGenerator.alphaNumeric(8)}`;
  const categoryTreeBody = {
    code: categoryTreeCode,
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
  TestValidator.equals(
    "created category tree code should match request",
    categoryTree.code,
    categoryTreeCode,
  );

  // 3. Create a category within the tree
  const categoryCode = `cat-${RandomGenerator.alphaNumeric(6)}`;
  const categoryBody = {
    code: categoryCode,
    name: "Electronics",
    description: RandomGenerator.paragraph({ sentences: 6 }),
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
  TestValidator.equals(
    "created category code should match request",
    category.code,
    categoryCode,
  );
  TestValidator.equals(
    "created category treeCode should match parent tree",
    category.treeCode,
    categoryTreeCode,
  );

  // 4. Create a product
  const productCode = `prod-${RandomGenerator.alphaNumeric(10)}` as string &
    tags.MinLength<1>;

  const dummySellerId = typia.random<string & tags.Format<"uuid">>();
  const productBody = {
    shopping_mall_seller_id: dummySellerId,
    shopping_mall_brand_id: null,
    code: productCode,
    name: RandomGenerator.name(3) as string & tags.MinLength<1>,
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: false,
    primary_image_uri:
      "https://cdn.shoppingmall.test/images/sample.png" as string &
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
  TestValidator.equals(
    "created product code should match request",
    product.code,
    productCode,
  );

  // 5. Assign the category to the product as primary
  const assignmentBody = {
    shopping_mall_category_id: category.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategoryAssignment.ICreate;

  const firstAssignment: IShoppingMallProductCategoryAssignment =
    await api.functional.shoppingMall.platformAdmin.products.categories.create(
      connection,
      {
        productCode,
        body: assignmentBody,
      },
    );
  typia.assert<IShoppingMallProductCategoryAssignment>(firstAssignment);

  // 6. Verify assignment references
  TestValidator.equals(
    "first assignment should reference the correct product id",
    firstAssignment.product.id,
    product.id,
  );
  TestValidator.equals(
    "first assignment should reference the correct category id",
    firstAssignment.category.id,
    category.id,
  );
  TestValidator.equals(
    "first assignment should have is_primary = true",
    firstAssignment.is_primary,
    true,
  );

  // 7. Call the same assignment again to validate upsert behavior
  const secondAssignment: IShoppingMallProductCategoryAssignment =
    await api.functional.shoppingMall.platformAdmin.products.categories.create(
      connection,
      {
        productCode,
        body: assignmentBody,
      },
    );
  typia.assert<IShoppingMallProductCategoryAssignment>(secondAssignment);

  TestValidator.equals(
    "second assignment should keep the same assignment id (upsert semantics)",
    secondAssignment.id,
    firstAssignment.id,
  );
  TestValidator.equals(
    "second assignment product reference should remain consistent",
    secondAssignment.product.id,
    product.id,
  );
  TestValidator.equals(
    "second assignment category reference should remain consistent",
    secondAssignment.category.id,
    category.id,
  );
  TestValidator.equals(
    "second assignment should still be primary",
    secondAssignment.is_primary,
    true,
  );
}
