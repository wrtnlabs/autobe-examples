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
 * Verify that deleting a product–category assignment with a non-existent
 * product code or a non-existent assignment id fails with an error and does not
 * affect valid assignments.
 *
 * Business context: Platform admins manage catalog product–category assignments
 * through shopping_mall_product_category_assignments. The DELETE endpoint
 * /shoppingMall/platformAdmin/products/{productCode}/categories/{productCategoryAssignmentId}
 * must only remove an assignment when both the product (by business
 * productCode) and the assignment record belong together. If either the product
 * code cannot be resolved or the assignment id does not belong to the product,
 * the implementation should behave in a not-found style manner and leave
 * existing assignments untouched.
 *
 * Scenario under test:
 *
 * 1. Join as a platform admin so that all subsequent platformAdmin endpoints are
 *    authorized.
 * 2. Create a category tree.
 * 3. Create a concrete category under that tree.
 * 4. Create a brand.
 * 5. Create a real product (productCodeReal) associated with some seller id and
 *    the brand.
 * 6. Create a product–category assignment for that product, capturing its id as
 *    productCategoryAssignmentId.
 * 7. Construct a clearly fake product code that does not exist.
 * 8. Call erase with the fake product code and the real assignment id and assert
 *    that an error is thrown ("not-found style"), using TestValidator.error
 *    without checking specific HTTP status.
 * 9. Generate a random UUID to use as a non-existent assignment id and call erase
 *    with the real product code and this bogus id, again asserting an error via
 *    TestValidator.error.
 * 10. Finally, call erase once with the correct pair (real product code and real
 *     assignment id) and ensure it succeeds without error. This demonstrates
 *     that the previous failed deletes did not remove the assignment or
 *     otherwise corrupt data.
 */
export async function test_api_platform_admin_delete_assignment_on_nonexistent_product_or_assignment(
  connection: api.IConnection,
) {
  // 1. Join as platform admin to authorize subsequent operations
  const adminJoinBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@admin.test.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.test.com/join",
    referrer: "https://admin.test.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Create a category tree
  const categoryTreeBody = {
    code: `tree-${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(),
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

  // 3. Create a category under the tree
  const categoryBody = {
    code: `cat-${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(),
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
    logo_uri: "https://cdn.test.com/logo.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert<IShoppingMallBrand>(brand);

  // 5. Create a real product for control
  const productCodeReal: string = `prod-${RandomGenerator.alphaNumeric(10)}`;

  // We do not have a seller creation API here, so we must synthesize a seller
  // id. Use random UUID format to satisfy the type requirements.
  const syntheticSellerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const productBody = {
    shopping_mall_seller_id: syntheticSellerId,
    shopping_mall_brand_id: brand.id,
    code: productCodeReal as string & tags.MinLength<1>,
    name: RandomGenerator.name(),
    short_description: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: false,
    primary_image_uri: "https://cdn.test.com/product.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      { body: productBody },
    );
  typia.assert<IShoppingMallProduct>(product);

  // 6. Create a valid product–category assignment
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
  typia.assert<IShoppingMallProductCategoryAssignment>(assignment);

  const productCategoryAssignmentId: string & tags.Format<"uuid"> =
    assignment.id;

  // 7. Construct a clearly non-existent product code
  const productCodeFake: string = `nonexistent-${RandomGenerator.alphaNumeric(12)}`;

  // 8. Attempt delete with fake product code and real assignment id
  await TestValidator.error(
    "erase with fake product code should fail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.products.categories.erase(
        connection,
        {
          productCode: productCodeFake,
          productCategoryAssignmentId,
        },
      );
    },
  );

  // 9. Attempt delete with real product code and non-existent assignment id
  const nonexistentAssignmentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  await TestValidator.error(
    "erase with non-existent assignment id should fail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.products.categories.erase(
        connection,
        {
          productCode: product.code,
          productCategoryAssignmentId: nonexistentAssignmentId,
        },
      );
    },
  );

  // 10. Finally, delete with the correct product code and assignment id.
  // If this succeeds without throwing, we treat it as evidence that the
  // earlier failed attempts did not remove the assignment.
  await api.functional.shoppingMall.platformAdmin.products.categories.erase(
    connection,
    {
      productCode: product.code,
      productCategoryAssignmentId,
    },
  );
}
