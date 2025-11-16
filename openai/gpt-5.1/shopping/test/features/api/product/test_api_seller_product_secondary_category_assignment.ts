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
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategoryAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategoryAssignment";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";

/**
 * Validate that a seller can add a secondary (non-primary) category assignment
 * to a product that already has a primary category, using seller and
 * platformAdmin actors.
 *
 * Steps:
 *
 * 1. Register a seller account using auth.seller.join.
 * 2. As the seller, create a product using shoppingMall.seller.products.create.
 * 3. Register a platform admin using auth.platformAdmin.join.
 * 4. As the platform admin, create a category tree using
 *    shoppingMall.platformAdmin.categoryTrees.create.
 * 5. As the platform admin, create two active categories in that tree using
 *    shoppingMall.platformAdmin.categoryTrees.categories.create.
 * 6. Switch back to the seller account by logging in with auth.seller.login.
 * 7. As the seller, assign the first category as the product's primary category
 *    via shoppingMall.seller.products.categories.create with is_primary=true.
 * 8. As the seller, assign the second category as a secondary category via
 *    shoppingMall.seller.products.categories.create with is_primary=false.
 * 9. Since no listing endpoint for assignments exists in the SDK, validate by
 *    checking the two assignment responses:
 *
 *    - Both assignments reference the same product (product.id matches).
 *    - The category summaries are different and match the two created categories.
 *    - Exactly one assignment has is_primary=true (primary) and the other has
 *         is_primary=false (secondary).
 */
export async function test_api_seller_product_secondary_category_assignment(
  connection: api.IConnection,
) {
  // 1. Register seller
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const sellerJoinBody = {
    email: sellerEmail,
    password: RandomGenerator.alphaNumeric(12),
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuth);

  // 2. Create product as seller
  const productCreateBody = {
    shopping_mall_seller_id: sellerAuth.id,
    shopping_mall_brand_id: undefined,
    code: RandomGenerator.alphaNumeric(12) as string & tags.MinLength<1>,
    name: RandomGenerator.name(3) as string & tags.MinLength<1>,
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: false,
    primary_image_uri: undefined,
    additional_data: undefined,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 3. Register platform admin
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const platformAdminJoinBody = {
    email: adminEmail,
    name: RandomGenerator.name(2),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://admin.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminAuth: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuth);

  // 4. Create category tree as platform admin
  const categoryTreeCode: string = RandomGenerator.alphaNumeric(10);

  const categoryTreeCreateBody = {
    code: categoryTreeCode,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      {
        body: categoryTreeCreateBody,
      },
    );
  typia.assert(categoryTree);

  // 5. Create primary and secondary categories in that tree
  const primaryCategoryBody = {
    code: "PRIMARY_" + RandomGenerator.alphaNumeric(6),
    name: "Primary Category " + RandomGenerator.name(1),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    displayOrder: 1 as number & tags.Type<"int32">,
    isActive: true,
    parentCategoryCode: undefined,
  } satisfies IShoppingMallCategory.ICreate;

  const primaryCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.categories.create(
      connection,
      {
        categoryTreeCode: categoryTree.code,
        body: primaryCategoryBody,
      },
    );
  typia.assert(primaryCategory);

  const secondaryCategoryBody = {
    code: "SECONDARY_" + RandomGenerator.alphaNumeric(6),
    name: "Secondary Category " + RandomGenerator.name(1),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    displayOrder: 2 as number & tags.Type<"int32">,
    isActive: true,
    parentCategoryCode: undefined,
  } satisfies IShoppingMallCategory.ICreate;

  const secondaryCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.categories.create(
      connection,
      {
        categoryTreeCode: categoryTree.code,
        body: secondaryCategoryBody,
      },
    );
  typia.assert(secondaryCategory);

  // 6. Switch back to seller via login (ensures seller auth is active)
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://seller.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerLoginAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoginAuth);

  // 7. Assign primary category to product
  const primaryAssignmentBody = {
    shopping_mall_category_id: primaryCategory.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategoryAssignment.ICreate;

  const primaryAssignment: IShoppingMallProductCategoryAssignment =
    await api.functional.shoppingMall.seller.products.categories.create(
      connection,
      {
        productCode: product.code,
        body: primaryAssignmentBody,
      },
    );
  typia.assert(primaryAssignment);

  // 8. Assign secondary category to product (non-primary)
  const secondaryAssignmentBody = {
    shopping_mall_category_id: secondaryCategory.id,
    is_primary: false,
  } satisfies IShoppingMallProductCategoryAssignment.ICreate;

  const secondaryAssignment: IShoppingMallProductCategoryAssignment =
    await api.functional.shoppingMall.seller.products.categories.create(
      connection,
      {
        productCode: product.code,
        body: secondaryAssignmentBody,
      },
    );
  typia.assert(secondaryAssignment);

  // 9. Validate assignments using the two responses

  // Both assignments must reference the same product
  TestValidator.equals(
    "primary and secondary assignments reference same product",
    primaryAssignment.product.id,
    secondaryAssignment.product.id,
  );

  TestValidator.equals(
    "assignment product id matches created product",
    primaryAssignment.product.id,
    product.id,
  );

  // Categories must be different and match the created categories
  TestValidator.notEquals(
    "primary and secondary category ids must differ",
    primaryAssignment.category.id,
    secondaryAssignment.category.id,
  );

  TestValidator.equals(
    "primary assignment category matches primary category",
    primaryAssignment.category.id,
    primaryCategory.id,
  );

  TestValidator.equals(
    "secondary assignment category matches secondary category",
    secondaryAssignment.category.id,
    secondaryCategory.id,
  );

  // Primary assignment must have is_primary=true
  TestValidator.equals(
    "primary assignment has is_primary=true",
    primaryAssignment.is_primary,
    true,
  );

  // Secondary assignment must have is_primary=false
  TestValidator.equals(
    "secondary assignment has is_primary=false",
    secondaryAssignment.is_primary,
    false,
  );

  // Ensure that creating secondary assignment did not change primary assignment's flag
  TestValidator.predicate(
    "primary assignment object remains primary after secondary assignment",
    primaryAssignment.is_primary === true,
  );
}
