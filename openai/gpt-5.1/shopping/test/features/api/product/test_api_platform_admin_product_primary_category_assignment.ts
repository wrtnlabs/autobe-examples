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
 * Validate that a platform admin can assign a primary category to a product.
 *
 * Business flow covered:
 *
 * 1. Register a platform admin (join) and rely on SDK to attach its token.
 * 2. Create a category tree as that admin.
 * 3. Create an active category in that tree.
 * 4. Create a brand.
 * 5. Create a product associated with that brand.
 * 6. Assign the created category as the product's primary category.
 * 7. Verify the assignment links the correct product and category and
 *    is_primary=true.
 */
export async function test_api_platform_admin_product_primary_category_assignment(
  connection: api.IConnection,
) {
  // 1. Register a new platform admin and authenticate
  const adminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Create a category tree
  const categoryTreeCode = `tree-${RandomGenerator.alphaNumeric(8)}`;
  const categoryTreeBody = {
    code: categoryTreeCode,
    name: "Primary Catalog Tree",
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
  TestValidator.equals(
    "created category tree code matches request",
    categoryTree.code,
    categoryTreeCode,
  );

  // 3. Create an active category in that tree
  const categoryCode = `cat-${RandomGenerator.alphaNumeric(6)}`;
  const categoryBody = {
    code: categoryCode,
    name: "Primary Assignment Category",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    displayOrder: 1 as number & tags.Type<"int32">,
    isActive: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.categories.create(
      connection,
      {
        categoryTreeCode: categoryTreeCode,
        body: categoryBody,
      },
    );
  typia.assert<IShoppingMallCategory>(category);
  TestValidator.equals(
    "created category belongs to the expected tree",
    category.treeCode,
    categoryTreeCode,
  );
  TestValidator.equals(
    "created category code matches request",
    category.code,
    categoryCode,
  );

  // 4. Create a brand
  const brandSlug = `brand-${RandomGenerator.alphaNumeric(8)}`;
  const brandBody = {
    name: "E2E Test Brand",
    slug: brandSlug,
    description: RandomGenerator.paragraph({ sentences: 4 }),
    logo_uri: "https://cdn.example.com/logos/test-brand.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert<IShoppingMallBrand>(brand);
  TestValidator.equals(
    "created brand slug matches request",
    brand.slug,
    brandSlug,
  );

  // 5. Create a product associated with that brand
  // NOTE: seller summary is not creatable in this test; we must still provide
  // a syntactically valid UUID for shopping_mall_seller_id, and rely on
  // backend fixtures or relaxed constraints in the test environment.
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  const productCode = `prd-${RandomGenerator.alphaNumeric(10)}`;

  const productBody = {
    shopping_mall_seller_id: sellerId,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: "E2E Primary Category Product",
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: false,
    primary_image_uri: "https://cdn.example.com/images/product-main.png",
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
    "created product code matches request",
    product.code,
    productCode,
  );
  TestValidator.equals(
    "created product brand id matches brand",
    product.brand?.id ?? null,
    brand.id,
  );

  // 6. Assign the category as the primary category for the product
  const assignmentBody = {
    shopping_mall_category_id: category.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategoryAssignment.ICreate;

  const assignment: IShoppingMallProductCategoryAssignment =
    await api.functional.shoppingMall.platformAdmin.products.categories.create(
      connection,
      {
        productCode: productCode,
        body: assignmentBody,
      },
    );
  typia.assert<IShoppingMallProductCategoryAssignment>(assignment);

  // 7. Assertions on the assignment
  TestValidator.equals(
    "assignment product id matches created product",
    assignment.product.id,
    product.id,
  );
  TestValidator.equals(
    "assignment category id matches created category",
    assignment.category.id,
    category.id,
  );
  TestValidator.equals(
    "assignment is marked as primary",
    assignment.is_primary,
    true,
  );
}
