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
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerAuthLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthLogin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";

/**
 * Validate cross-seller authorization on product image deletion.
 *
 * Business scenario
 *
 * - Seller A owns a product and an associated gallery image.
 * - Seller B, a different seller, must NOT be able to delete that image via the
 *   seller deletion endpoint.
 * - The owning seller A must still be able to delete the image successfully.
 *
 * End-to-end flow
 *
 * 1. Create seller A via /auth/seller/join.
 * 2. Authenticate as seller A (implicitly done by join) and create product A via
 *    POST /shoppingMall/seller/products.
 * 3. Create an admin account and login as admin.
 * 4. As admin, create a category via POST /shoppingMall/admin/categories.
 * 5. As admin, link product A to the category via POST
 *    /shoppingMall/admin/products/{productId}/categories.
 * 6. Switch back to seller A by logging in with seller A credentials.
 * 7. As seller A, create an image for product A via POST
 *    /shoppingMall/products/{productId}/images.
 * 8. Create seller B via /auth/seller/join and/or /auth/seller/login so that the
 *    connection is authenticated as seller B.
 * 9. As seller B, attempt to delete the image of product A via DELETE
 *    /shoppingMall/seller/products/{productId_A}/images/{imageId_A}. Expect
 *    this to fail with an authorization-related error (but do not assert
 *    specific HTTP status codes).
 * 10. Switch back to seller A with /auth/seller/login.
 * 11. As seller A, delete the same image via the same DELETE endpoint and expect it
 *     to succeed.
 */
export async function test_api_seller_product_image_delete_cross_seller_forbidden(
  connection: api.IConnection,
) {
  // ---------- 1. Register seller A ----------
  const sellerAEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerAPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const sellerAJoinBody = {
    email: sellerAEmail,
    password: sellerAPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerAJoinBody,
    });
  typia.assert(sellerAAuth);

  // ---------- 2. Seller A creates product A ----------
  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(12),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: null,
    model_name: null,
    status: "active",
    primary_image_uri: null,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const productA: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(productA);

  TestValidator.equals(
    "product seller id matches seller A",
    productA.seller?.id ?? sellerAAuth.id,
    sellerAAuth.id,
  );

  // ---------- 3. Admin join & login ----------
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuth);

  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLoginAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAuth);

  // ---------- 4. Admin creates category ----------
  const categoryCreateBody = {
    parent_id: null,
    slug: RandomGenerator.alphaNumeric(8),
    name_en: RandomGenerator.name(2),
    description_en: null,
    status: "active",
    sort_order: 0 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreateBody,
    });
  typia.assert(category);

  // ---------- 5. Admin links product A to category ----------
  const productCategoryCreateBody = {
    shopping_mall_category_id: category.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;

  const productCategory: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: productA.id,
        body: productCategoryCreateBody,
      },
    );
  typia.assert(productCategory);

  TestValidator.equals(
    "productCategory.productId matches productA.id",
    productCategory.shopping_mall_product_id,
    productA.id,
  );

  // ---------- 6. Switch back to seller A (login) ----------
  const sellerALoginBody = {
    email: sellerAEmail,
    password: sellerAPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerALoginAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerALoginBody,
    });
  typia.assert(sellerALoginAuth);

  // ---------- 7. Seller A creates a product image ----------
  const productImageCreateBody = {
    image_uri: typia.random<string & tags.Format<"uri">>(),
    alt_text: RandomGenerator.paragraph({ sentences: 2 }),
    display_order: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductImage.ICreate;

  const imageA: IShoppingMallProductImage =
    await api.functional.shoppingMall.products.images.create(connection, {
      productId: productA.id,
      body: productImageCreateBody,
    });
  typia.assert(imageA);

  TestValidator.equals(
    "image product id matches productA.id",
    imageA.shopping_mall_product_id,
    productA.id,
  );

  // ---------- 8. Register seller B ----------
  const sellerBEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerBPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const sellerBJoinBody = {
    email: sellerBEmail,
    password: sellerBPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerBAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerBJoinBody,
    });
  typia.assert(sellerBAuth);

  // ---------- 9. As seller B, attempt to delete seller A's image ----------
  await TestValidator.error(
    "seller B cannot delete seller A's product image",
    async () => {
      await api.functional.shoppingMall.seller.products.images.erase(
        connection,
        {
          productId: imageA.shopping_mall_product_id,
          productImageId: imageA.id,
        },
      );
    },
  );

  // ---------- 10. Switch back to seller A and delete successfully ----------
  const sellerALoginBodyAgain = {
    email: sellerAEmail,
    password: sellerAPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerALoginAuthAgain: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerALoginBodyAgain,
    });
  typia.assert(sellerALoginAuthAgain);

  await api.functional.shoppingMall.seller.products.images.erase(connection, {
    productId: imageA.shopping_mall_product_id,
    productImageId: imageA.id,
  });
}
