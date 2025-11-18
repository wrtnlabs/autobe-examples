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
 * Validate behavior of updating a seller product image after it has been
 * deleted.
 *
 * Business context:
 *
 * - Sellers manage products and gallery images under
 *   /shoppingMall/seller/products.
 * - Additional images are created under
 *   /shoppingMall/products/{productId}/images.
 * - Sellers can delete images via
 *   /shoppingMall/seller/products/{productId}/images/{productImageId}.
 * - The update endpoint
 *   /shoppingMall/seller/products/{productId}/images/{productImageId} may
 *   behave differently depending on whether deletion is implemented as soft
 *   delete or hard delete.
 *
 * This test establishes a realistic catalog configuration (seller, product,
 * admin category, product-category link), creates an image, deletes it, then
 * attempts to update it to empirically determine whether the platform allows
 * updating a deleted image (soft delete/reactivation) or rejects the operation
 * (hard delete / immutable deletion).
 *
 * Steps:
 *
 * 1. Register a seller via /auth/seller/join and rely on SDK to store its token on
 *    the connection.
 * 2. As seller, create a product via /shoppingMall/seller/products using a valid
 *    IShoppingMallProduct.ICreate body.
 * 3. Register an admin via /auth/admin/join and let SDK switch the connection
 *    token.
 * 4. As admin, create a category via /shoppingMall/admin/categories with
 *    IShoppingMallCategory.ICreate.
 * 5. As admin, link the product to that category via
 *    /shoppingMall/admin/products/{productId}/categories.
 * 6. Log back in as seller via /auth/seller/login to restore seller auth on the
 *    connection.
 * 7. As seller, create a product image via
 *    /shoppingMall/products/{productId}/images.
 * 8. As seller, delete that image via
 *    /shoppingMall/seller/products/{productId}/images/{productImageId}.
 * 9. As seller, attempt to update the deleted image via the same seller
 *    images.update endpoint.
 * 10. If update succeeds, assert that the returned image has the same id, product
 *     linkage, and that update fields (like alt_text or image_uri) reflect the
 *     new values.
 * 11. If update fails (throws), assert the error using TestValidator.error,
 *     documenting that deleted images cannot be updated (hard delete like
 *     behavior).
 */
export async function test_api_seller_product_image_update_reactivate_soft_deleted_image_behavior(
  connection: api.IConnection,
) {
  // 1. Register seller (join)
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://seller.example.com/join",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuthorized);

  const sellerEmail: string & tags.Format<"email"> = sellerAuthorized.email;
  const sellerPassword: string & tags.Format<"password"> =
    sellerJoinBody.password;

  // 2. Seller creates a product
  const createProductBody = {
    code: RandomGenerator.alphaNumeric(12),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: RandomGenerator.name(1),
    model_name: RandomGenerator.name(1),
    status: "active",
    primary_image_uri: "https://cdn.example.com/images/primary.jpg" as string &
      tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: createProductBody,
    });
  typia.assert<IShoppingMallProduct>(product);

  // 3. Register an admin
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  const adminEmail: string & tags.Format<"email"> = adminAuthorized.email;
  const adminPassword: string & tags.Format<"password"> =
    adminJoinBody.password;

  // 4. As admin, create a category
  const categoryBody = {
    parent_id: null,
    slug: RandomGenerator.alphaNumeric(8),
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    description_en: RandomGenerator.paragraph({ sentences: 5 }),
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryBody,
    });
  typia.assert<IShoppingMallCategory>(category);

  // 5. As admin, link the product to the category
  const productCategoryBody = {
    shopping_mall_category_id: category.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;

  const productCategory: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: product.id,
        body: productCategoryBody,
      },
    );
  typia.assert<IShoppingMallProductCategory>(productCategory);

  // 6. Log back in as seller to ensure seller auth on the connection
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerAfterLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAfterLogin);

  // 7. As seller, create a product image under the product
  const imageCreateBody = {
    image_uri: "https://cdn.example.com/images/gallery-1.jpg" as string &
      tags.Format<"uri">,
    alt_text: RandomGenerator.paragraph({ sentences: 2 }),
    display_order: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductImage.ICreate;

  const createdImage: IShoppingMallProductImage =
    await api.functional.shoppingMall.products.images.create(connection, {
      productId: product.id,
      body: imageCreateBody,
    });
  typia.assert<IShoppingMallProductImage>(createdImage);

  // 8. As seller, delete the image via seller erase endpoint
  await api.functional.shoppingMall.seller.products.images.erase(connection, {
    productId: createdImage.shopping_mall_product_id,
    productImageId: createdImage.id,
  });

  // Prepare update payload.
  const updatedAltText: string = RandomGenerator.paragraph({ sentences: 3 });
  const updatedImageUri: string & tags.Format<"uri"> =
    "https://cdn.example.com/images/gallery-1-updated.jpg" as string &
      tags.Format<"uri">;

  const updateBody = {
    image_uri: updatedImageUri,
    alt_text: updatedAltText,
  } satisfies IShoppingMallProductImage.IUpdate;

  // 9 & 10. Attempt update and classify behavior.
  let updateSucceeded = false;
  let updatedImage: IShoppingMallProductImage | null = null;

  try {
    updatedImage =
      await api.functional.shoppingMall.seller.products.images.update(
        connection,
        {
          productId: createdImage.shopping_mall_product_id,
          productImageId: createdImage.id,
          body: updateBody,
        },
      );
    typia.assert<IShoppingMallProductImage>(updatedImage);
    updateSucceeded = true;
  } catch {
    updateSucceeded = false;
  }

  if (updateSucceeded && updatedImage !== null) {
    // Soft delete or reactivation behavior: update after erase is allowed.
    TestValidator.equals(
      "updated image keeps same id as original",
      updatedImage.id,
      createdImage.id,
    );
    TestValidator.equals(
      "updated image remains linked to same product",
      updatedImage.shopping_mall_product_id,
      createdImage.shopping_mall_product_id,
    );
    TestValidator.equals(
      "updated image alt_text reflects update payload",
      updatedImage.alt_text ?? null,
      updatedAltText,
    );
    TestValidator.equals(
      "updated image image_uri reflects update payload",
      updatedImage.image_uri,
      updatedImageUri,
    );
  } else {
    // Hard delete behavior: once erased, update must fail.
    await TestValidator.error(
      "updating a deleted product image should fail after erase",
      async () => {
        await api.functional.shoppingMall.seller.products.images.update(
          connection,
          {
            productId: createdImage.shopping_mall_product_id,
            productImageId: createdImage.id,
            body: updateBody,
          },
        );
      },
    );
  }
}
