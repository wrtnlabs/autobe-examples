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
 * Validate that platform admin cannot update a product–category assignment
 * using a mismatched productCode.
 *
 * Business rule / invariant: A product–category assignment row in
 * shopping_mall_product_category_assignments belongs to exactly one product.
 * The update endpoint PUT
 * /shoppingMall/platformAdmin/products/{productCode}/categories/{productCategoryAssignmentId}
 * must ensure that the assignment id belongs to the product identified by
 * productCode. If not, the server should treat it as not-found for this product
 * context and reject the operation.
 *
 * Test workflow (negative path):
 *
 * 1. Register a platform admin via POST /auth/platformAdmin/join, obtaining an
 *    authorized admin session for all subsequent catalog operations.
 * 2. Create a category tree using IShoppingMallCategoryTree.ICreate.
 * 3. Under that tree, create a category using IShoppingMallCategory.ICreate.
 * 4. Create a brand using IShoppingMallBrand.ICreate so products can reference it.
 * 5. Create two products via IShoppingMallProduct.ICreate, capturing their codes
 *    as productCodeA and productCodeB.
 * 6. For product A, create a product–category assignment with
 *    IShoppingMallProductCategoryAssignment.ICreate and capture its id.
 * 7. Attempt to update that assignment using productCodeB combined with the
 *    assignment id from product A, sending a syntactically valid
 *    IShoppingMallProductCategoryAssignment.IUpdate body.
 * 8. Assert that the update call fails (throws an HttpError underneath), using
 *    TestValidator.error to verify error occurrence without depending on a
 *    specific HTTP status code.
 *
 * Implementation notes and constraints:
 *
 * - We must not inspect or assert HTTP status codes directly.
 * - We must not deliberately send wrong-typed data; all DTOs must be valid.
 * - The SDK function signatures guarantee that a successful call returns
 *   IShoppingMallProductCategoryAssignment, and failures manifest as thrown
 *   HttpError. We therefore only need to assert that an error is thrown when
 *   the assignment id does not belong to the specified productCode.
 * - We do not perform follow-up listing to check that no mutation occurred, as no
 *   listing API is provided in the materials.
 */
export async function test_api_platform_admin_fails_to_update_assignment_for_mismatched_product(
  connection: api.IConnection,
) {
  // 1. Join as platform admin to establish Authorization header via SDK.
  const joinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    name: RandomGenerator.name(2),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Create a category tree.
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
  typia.assert<IShoppingMallCategoryTree>(tree);

  // 3. Create a category within the tree.
  const categoryBody = {
    code: `cat-${RandomGenerator.alphaNumeric(6)}`,
    name: RandomGenerator.paragraph({ sentences: 1 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    // let server decide displayOrder when omitted
    isActive: true,
    // root category within the tree
    parentCategoryCode: undefined,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.categories.create(
      connection,
      {
        categoryTreeCode: tree.code,
        body: categoryBody,
      },
    );
  typia.assert<IShoppingMallCategory>(category);

  // 4. Create a brand to associate with products.
  const brandBody = {
    name: `Brand ${RandomGenerator.paragraph({ sentences: 1 })}`,
    slug: `brand-${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_uri: "https://cdn.example.com/logo.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert<IShoppingMallBrand>(brand);

  // 5. Create two products (A and B) owned by the same arbitrary seller.
  const sellerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const productBodyA = {
    shopping_mall_seller_id: sellerId,
    shopping_mall_brand_id: brand.id,
    code: `prd-A-${RandomGenerator.alphaNumeric(8)}` as string &
      tags.MinLength<1>,
    name: RandomGenerator.paragraph({ sentences: 2 }) as string &
      tags.MinLength<1>,
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: false,
    primary_image_uri: "https://cdn.example.com/productA.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const productA: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      {
        body: productBodyA,
      },
    );
  typia.assert<IShoppingMallProduct>(productA);

  const productBodyB = {
    shopping_mall_seller_id: sellerId,
    shopping_mall_brand_id: brand.id,
    code: `prd-B-${RandomGenerator.alphaNumeric(8)}` as string &
      tags.MinLength<1>,
    name: RandomGenerator.paragraph({ sentences: 2 }) as string &
      tags.MinLength<1>,
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: false,
    primary_image_uri: "https://cdn.example.com/productB.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const productB: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      {
        body: productBodyB,
      },
    );
  typia.assert<IShoppingMallProduct>(productB);

  // 6. Create a category assignment for product A.
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
  typia.assert<IShoppingMallProductCategoryAssignment>(assignmentForA);

  // 7. Attempt to update the assignment using product B's code but A's assignment id.
  const updateBody = {
    isPrimary: false,
    sortOrder: 10 as number & tags.Type<"int32">,
    isVisibleInNavigation: true,
    isVisibleInSearch: true,
    activeFrom: null,
    activeUntil: null,
  } satisfies IShoppingMallProductCategoryAssignment.IUpdate;

  await TestValidator.error(
    "mismatched productCode and assignmentId must fail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.products.categories.update(
        connection,
        {
          productCode: productB.code,
          productCategoryAssignmentId: assignmentForA.id,
          body: updateBody,
        },
      );
    },
  );
}
