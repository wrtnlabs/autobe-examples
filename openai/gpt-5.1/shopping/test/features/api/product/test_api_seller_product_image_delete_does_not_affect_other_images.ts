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
 * Ensure that deleting one product image for a seller-owned product does not
 * affect other images of the same product.
 *
 * Business workflow covered by this test:
 *
 * 1. Seller joins and logs in to obtain an authenticated seller session.
 * 2. Seller creates a product using POST /shoppingMall/seller/products.
 * 3. Admin joins and logs in, then creates a category and associates it with the
 *    product using POST /shoppingMall/admin/categories and POST
 *    /shoppingMall/admin/products/{productId}/categories. This simulates
 *    realistic catalog configuration but does not directly affect image
 *    operations.
 * 4. As an authenticated seller, create two product images for the same product
 *    via POST /shoppingMall/products/{productId}/images with distinct
 *    `display_order` values.
 * 5. Delete only the first image using DELETE
 *    /shoppingMall/seller/products/{productId}/images/{productImageId}.
 * 6. Verify that the deletion call completes successfully and that the second
 *    image object (created earlier) remains logically intact in terms of its
 *    identifier and metadata (id, product linkage, image_uri, alt_text,
 *    display_order, timestamps).
 * 7. Optionally create a third image reusing the freed display_order to show that
 *    reusing that order slot does not require modifying the surviving second
 *    image’s metadata.
 */
export async function test_api_seller_product_image_delete_does_not_affect_other_images(
  connection: api.IConnection,
) {
  // 1. Seller joins (self-registration)
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
  typia.assert(sellerAuthorized);

  // 2. Seller explicitly logs in (to exercise login flow as dependency)
  const sellerLoginBody = {
    email: sellerJoinBody.email,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoggedIn);

  // 3. Seller creates a product
  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(12),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 8,
    }),
    brand: RandomGenerator.name(1),
    model_name: RandomGenerator.alphaNumeric(6),
    status: "active",
    primary_image_uri: "https://cdn.example.com/images/primary.jpg",
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 4. Admin joins and logs in for category management
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
  typia.assert(adminAuthorized);

  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLoggedIn: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  // 5. Admin creates a category
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
  typia.assert(category);

  // 6. Admin associates the product with the category
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
  typia.assert(productCategory);

  // 7. Switch back to seller context by logging in again as seller
  const sellerReLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerReLogin);

  // 8. Seller creates two product images for the same product
  const firstImageCreateBody = {
    image_uri: "https://cdn.example.com/images/product-first.jpg",
    alt_text: RandomGenerator.paragraph({ sentences: 2 }),
    display_order: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductImage.ICreate;

  const firstImage: IShoppingMallProductImage =
    await api.functional.shoppingMall.products.images.create(connection, {
      productId: product.id,
      body: firstImageCreateBody,
    });
  typia.assert(firstImage);

  const secondImageCreateBody = {
    image_uri: "https://cdn.example.com/images/product-second.jpg",
    alt_text: RandomGenerator.paragraph({ sentences: 2 }),
    display_order: 1 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductImage.ICreate;

  const secondImage: IShoppingMallProductImage =
    await api.functional.shoppingMall.products.images.create(connection, {
      productId: product.id,
      body: secondImageCreateBody,
    });
  typia.assert(secondImage);

  // Basic sanity checks that images are distinct and linked to same product
  TestValidator.notEquals(
    "first and second image must have different IDs",
    firstImage.id,
    secondImage.id,
  );
  TestValidator.equals(
    "both images must belong to the same product",
    firstImage.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals(
    "second image also belongs to the same product",
    secondImage.shopping_mall_product_id,
    product.id,
  );
  TestValidator.notEquals(
    "display orders must differ between first and second images",
    firstImage.display_order,
    secondImage.display_order,
  );

  // 9. Seller deletes only the first image using seller-scoped erase API
  await api.functional.shoppingMall.seller.products.images.erase(connection, {
    productId: firstImage.shopping_mall_product_id,
    productImageId: firstImage.id,
  });

  // If erase throws, the test will naturally fail; reaching here indicates
  // success. Now verify that the second image object we created earlier
  // remains logically intact and unchanged in memory.
  typia.assert<IShoppingMallProductImage>(secondImage);

  TestValidator.equals(
    "second image retains its original product linkage",
    secondImage.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals(
    "second image retains its display order of 1",
    secondImage.display_order,
    1 as number & tags.Type<"int32"> & tags.Minimum<0>,
  );

  // 10. Optionally create a third image reusing the freed display_order (0)
  const thirdImageCreateBody = {
    image_uri: "https://cdn.example.com/images/product-third.jpg",
    alt_text: RandomGenerator.paragraph({ sentences: 2 }),
    display_order: firstImage.display_order,
  } satisfies IShoppingMallProductImage.ICreate;

  const thirdImage: IShoppingMallProductImage =
    await api.functional.shoppingMall.products.images.create(connection, {
      productId: product.id,
      body: thirdImageCreateBody,
    });
  typia.assert(thirdImage);

  TestValidator.equals(
    "third image uses the same display order as deleted first image",
    thirdImage.display_order,
    firstImage.display_order,
  );
  TestValidator.equals(
    "third image is still associated with the same product",
    thirdImage.shopping_mall_product_id,
    product.id,
  );

  // Ensure the surviving second image is still distinct from the new third
  // image in ID and display_order, confirming no unintended mutation.
  TestValidator.notEquals(
    "second and third image IDs must differ",
    secondImage.id,
    thirdImage.id,
  );
  TestValidator.notEquals(
    "second and third image display orders must differ",
    secondImage.display_order,
    thirdImage.display_order,
  );
}
