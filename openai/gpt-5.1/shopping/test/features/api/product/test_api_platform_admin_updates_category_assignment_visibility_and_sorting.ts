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

export async function test_api_platform_admin_updates_category_assignment_visibility_and_sorting(
  connection: api.IConnection,
) {
  // 1. Platform admin join/authentication
  const joinBody = {
    email: `${RandomGenerator.alphabets(8)}@admin.example.com`,
    name: RandomGenerator.name(2),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create category tree
  const treeBody = {
    code: `tree-${RandomGenerator.alphabets(6)}`,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const tree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      { body: treeBody },
    );
  typia.assert(tree);

  // 3. Create category under the tree
  const categoryBody = {
    code: `cat-${RandomGenerator.alphabets(6)}`,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    displayOrder: 1 as number & tags.Type<"int32">,
    isActive: true,
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
  typia.assert(category);

  // 4. Create brand
  const brandBody = {
    name: RandomGenerator.name(2),
    slug: `brand-${RandomGenerator.alphabets(6)}`,
    description: RandomGenerator.paragraph({ sentences: 4 }),
    logo_uri: "https://cdn.example.com/logo.png" as string & tags.Format<"uri">,
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  // 5. Create product (using a random seller id to satisfy DTO)
  const sellerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const productBody = {
    shopping_mall_seller_id: sellerId,
    shopping_mall_brand_id: brand.id,
    code: `prod-${RandomGenerator.alphabets(8)}` as string & tags.MinLength<1>,
    name: RandomGenerator.name(3) as string & tags.MinLength<1>,
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
      { body: productBody },
    );
  typia.assert(product);

  // 6. Create initial product–category assignment (primary)
  const assignmentCreateBody = {
    shopping_mall_category_id: category.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategoryAssignment.ICreate;

  const initialAssignment: IShoppingMallProductCategoryAssignment =
    await api.functional.shoppingMall.platformAdmin.products.categories.create(
      connection,
      {
        productCode: product.code,
        body: assignmentCreateBody,
      },
    );
  typia.assert(initialAssignment);

  // 7. Build update DTO body for non-structural fields
  const now = new Date();
  const later = new Date(now.getTime() + 60 * 60 * 1000); // +1 hour

  const updateBody = {
    // Keep isPrimary unchanged (still true) by explicitly setting true
    isPrimary: true,
    sortOrder: 10 as number & tags.Type<"int32">,
    isVisibleInNavigation: true,
    isVisibleInSearch: false,
    activeFrom: now.toISOString() as string & tags.Format<"date-time">,
    activeUntil: later.toISOString() as string & tags.Format<"date-time">,
  } satisfies IShoppingMallProductCategoryAssignment.IUpdate;

  // 8. Call update operation
  const updatedAssignment: IShoppingMallProductCategoryAssignment =
    await api.functional.shoppingMall.platformAdmin.products.categories.update(
      connection,
      {
        productCode: product.code,
        productCategoryAssignmentId: initialAssignment.id,
        body: updateBody,
      },
    );
  typia.assert(updatedAssignment);

  // 9. Invariant and linkage validations
  // Id must remain the same
  TestValidator.equals(
    "assignment id remains unchanged",
    updatedAssignment.id,
    initialAssignment.id,
  );

  // Product linkage should remain identical
  TestValidator.equals(
    "product linkage remains unchanged",
    updatedAssignment.product.id,
    initialAssignment.product.id,
  );

  // Category linkage should remain identical
  TestValidator.equals(
    "category linkage remains unchanged",
    updatedAssignment.category.id,
    initialAssignment.category.id,
  );

  // Primary flag should remain true
  TestValidator.equals(
    "is_primary remains true",
    updatedAssignment.is_primary,
    initialAssignment.is_primary,
  );

  // created_at must remain the same
  TestValidator.equals(
    "created_at timestamp remains unchanged",
    updatedAssignment.created_at,
    initialAssignment.created_at,
  );

  // updated_at should be >= previous updated_at (lexicographical comparison ok for ISO strings)
  TestValidator.predicate(
    "updated_at is not earlier than before",
    () => updatedAssignment.updated_at >= initialAssignment.updated_at,
  );
}
