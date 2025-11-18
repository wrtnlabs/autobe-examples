import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerAuthLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthLogin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";

/**
 * Validate seller product creation and admin primary category linkage.
 *
 * Business goal:
 *
 * - Ensure that a seller can create a product without any pre-existing
 *   categories.
 * - Ensure that an admin can later create a category and link it as a primary
 *   category for that product.
 * - Verify that IDs and core fields remain consistent across the workflow and
 *   that the product-category link reflects the expected relationships.
 *
 * Steps:
 *
 * 1. Seller self-registers via /auth/seller/join and establishes an authenticated
 *    seller context.
 * 2. As the seller, create a product via /shoppingMall/seller/products with a
 *    fully-populated IShoppingMallProduct.ICreate.
 * 3. Capture and assert the returned IShoppingMallProduct; verify key fields
 *    (code, title, status, default_locale, primary_image_uri) match the input
 *    payload and that the product has a valid UUID id.
 * 4. Admin self-registers via /auth/admin/join and establishes an authenticated
 *    admin context.
 * 5. As the admin, create a category via /shoppingMall/admin/categories using
 *    IShoppingMallCategory.ICreate, then assert the response.
 * 6. As the admin, create a product-category link via
 *    /shoppingMall/admin/products/{productId}/categories with
 *    IShoppingMallProductCategory.ICreate using the product id and category id
 *    from earlier steps, with is_primary=true.
 * 7. Assert that the product-category link object references the correct product
 *    and category ids and that is_primary is true.
 */
export async function test_api_seller_product_creation_with_primary_category_linkage(
  connection: api.IConnection,
) {
  // 1. Seller joins (self-registration)
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://seller.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://seller.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuth);

  // 2. Seller creates a product
  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(10),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: RandomGenerator.name(1),
    model_name: RandomGenerator.alphaNumeric(6),
    status: "active",
    primary_image_uri: "https://cdn.example.com/images/".concat(
      RandomGenerator.alphaNumeric(16),
      ".jpg",
    ) as string & tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert<IShoppingMallProduct>(product);

  // Assert core product fields reflect creation payload
  TestValidator.equals(
    "product code should match create payload",
    product.code,
    productCreateBody.code,
  );
  TestValidator.equals(
    "product title should match create payload",
    product.title,
    productCreateBody.title,
  );
  TestValidator.equals(
    "product status should match create payload",
    product.status,
    productCreateBody.status,
  );
  TestValidator.equals(
    "product default_locale should match create payload",
    product.default_locale,
    productCreateBody.default_locale,
  );

  // 3. Admin joins (self-registration)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(14) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://admin.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuth);

  // 4. Admin creates a category
  const categoryCreateBody = {
    parent_id: null,
    slug: RandomGenerator.alphaNumeric(8),
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    description_en: RandomGenerator.paragraph({ sentences: 4 }),
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreateBody,
    });
  typia.assert<IShoppingMallCategory>(category);

  TestValidator.equals(
    "category slug should match create payload",
    category.slug,
    categoryCreateBody.slug,
  );
  TestValidator.equals(
    "category status should match create payload",
    category.status,
    categoryCreateBody.status,
  );

  // 5. Admin links the product to the category as primary
  const productCategoryCreateBody = {
    shopping_mall_category_id: category.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;

  const productCategory: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: product.id,
        body: productCategoryCreateBody,
      },
    );
  typia.assert<IShoppingMallProductCategory>(productCategory);

  // Validate linkage correctness
  TestValidator.equals(
    "product-category link should reference created product",
    productCategory.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals(
    "product-category link should reference created category",
    productCategory.shopping_mall_category_id,
    category.id,
  );
  TestValidator.equals(
    "product-category link should be primary",
    productCategory.is_primary,
    true,
  );
}
