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
 * Validate that an admin can safely update a product after setting up category
 * taxonomy and product–category links.
 *
 * Business goal
 *
 * - Ensure seller-created products can be curated by admins without breaking
 *   existing taxonomy links.
 * - Confirm that admin updates on core product fields (title, summary, brand,
 *   status, default_locale, etc.) do not implicitly alter or remove
 *   product–category associations created beforehand.
 *
 * End-to-end steps
 *
 * 1. Seller joins the platform using /auth/seller/join and becomes authenticated
 *    (access token is set into connection automatically).
 * 2. As the seller, create a base product via POST /shoppingMall/seller/products
 *    using IShoppingMallProduct.ICreate and capture the returned
 *    IShoppingMallProduct.id.
 * 3. Admin joins the platform using /auth/admin/join (auto-auth as admin).
 * 4. Using admin privileges, create a new category with POST
 *    /shoppingMall/admin/categories and IShoppingMallCategory.ICreate; capture
 *    its id.
 * 5. Still as admin, create a product–category link via POST
 *    /shoppingMall/admin/products/{productId}/categories using
 *    IShoppingMallProductCategory.ICreate with is_primary = true. Capture and
 *    assert the link.
 * 6. With admin token still active, update the product via PUT
 *    /shoppingMall/admin/products/{productId} using
 *    IShoppingMallProduct.IUpdate, changing several core fields such as title,
 *    summary, brand, status, and default_locale.
 * 7. Assert that the response IShoppingMallProduct reflects the updated fields and
 *    that its id and shopping_mall_seller_id are unchanged.
 * 8. Assert that the earlier IShoppingMallProductCategory link object is still
 *    valid and unchanged (same product id, same category id, is_primary remains
 *    true), thereby demonstrating that admin updates did not tamper with
 *    taxonomy links.
 */
export async function test_api_admin_product_update_with_category_setup(
  connection: api.IConnection,
) {
  // 1. Seller joins the platform (auto-auth as seller)
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

  // 2. Seller creates a base product
  const sellerProductCreateBody = {
    code: RandomGenerator.alphaNumeric(10),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: RandomGenerator.paragraph({ sentences: 2 }),
    model_name: RandomGenerator.paragraph({ sentences: 2 }),
    status: "active",
    primary_image_uri: ("https://cdn.example.com/images/" +
      RandomGenerator.alphaNumeric(16)) as string & tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const createdProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: sellerProductCreateBody,
    });
  typia.assert<IShoppingMallProduct>(createdProduct);

  // 3. Admin joins the platform (auto-auth as admin)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16) as string &
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
    slug: RandomGenerator.alphaNumeric(12),
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    description_en: RandomGenerator.paragraph({ sentences: 4 }),
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const createdCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreateBody,
    });
  typia.assert<IShoppingMallCategory>(createdCategory);

  // 5. Admin links product to category as primary
  const productCategoryCreateBody = {
    shopping_mall_category_id: createdCategory.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;

  const createdLink: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: createdProduct.id,
        body: productCategoryCreateBody,
      },
    );
  typia.assert<IShoppingMallProductCategory>(createdLink);

  // 6. Admin updates the product
  const updatedTitle = RandomGenerator.paragraph({ sentences: 2 });
  const updatedSummary = RandomGenerator.paragraph({ sentences: 3 });
  const updatedBrand = RandomGenerator.paragraph({ sentences: 1 });
  const updatedStatus = "admin_unpublished";
  const updatedLocale = "en-GB";
  const updatedImageUri = ("https://cdn.example.com/images/" +
    RandomGenerator.alphaNumeric(18)) as string & tags.Format<"uri">;

  const productUpdateBody = {
    title: updatedTitle,
    summary: updatedSummary,
    brand: updatedBrand,
    status: updatedStatus,
    default_locale: updatedLocale,
    primary_image_uri: updatedImageUri,
  } satisfies IShoppingMallProduct.IUpdate;

  const updatedProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.admin.products.update(connection, {
      productId: createdProduct.id as string & tags.Format<"uuid">,
      body: productUpdateBody,
    });
  typia.assert<IShoppingMallProduct>(updatedProduct);

  // 7. Validate updated product fields
  TestValidator.equals(
    "product id should stay the same after admin update",
    updatedProduct.id,
    createdProduct.id,
  );

  TestValidator.equals(
    "product seller id should not change after admin update",
    updatedProduct.shopping_mall_seller_id,
    createdProduct.shopping_mall_seller_id,
  );

  TestValidator.equals(
    "title should be updated by admin",
    updatedProduct.title,
    updatedTitle,
  );

  TestValidator.equals(
    "summary should be updated by admin",
    updatedProduct.summary,
    updatedSummary,
  );

  TestValidator.equals(
    "brand should be updated by admin (may be nullable, but here set to string)",
    updatedProduct.brand,
    updatedBrand,
  );

  TestValidator.equals(
    "status should reflect new admin status",
    updatedProduct.status,
    updatedStatus,
  );

  TestValidator.equals(
    "default locale should be updated",
    updatedProduct.default_locale,
    updatedLocale,
  );

  TestValidator.equals(
    "primary image URI should be updated",
    updatedProduct.primary_image_uri,
    updatedImageUri,
  );

  // 8. Validate that product-category link remains logically intact
  TestValidator.equals(
    "product-category link should remain bound to the same product id",
    createdLink.shopping_mall_product_id,
    createdProduct.id,
  );

  TestValidator.equals(
    "product-category link should remain bound to the same category id",
    createdLink.shopping_mall_category_id,
    createdCategory.id,
  );

  TestValidator.equals(
    "product-category link should remain primary",
    createdLink.is_primary,
    true,
  );
}
