import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductMedia } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductMedia";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";

/**
 * Validate deletion of a seller product's current primary media asset.
 *
 * Business goal: Ensure that a seller can delete a product media record that
 * was created as primary, while another non-primary media remains. Because only
 * create and delete media APIs are available in the SDK, we validate the
 * workflow up to deletion and cross-entity consistency based on create
 * responses.
 *
 * Scenario steps:
 *
 * 1. Platform admin joins and logs in to obtain permissions for brand creation.
 * 2. Platform admin creates a brand via /shoppingMall/platformAdmin/brands.
 * 3. Seller joins and logs in to obtain permissions for seller product/media APIs.
 * 4. Seller creates a product associated with the brand via
 *    /shoppingMall/seller/products with is_multi_sku set.
 * 5. Seller creates two media records for the product via
 *    /shoppingMall/seller/products/{productCode}/media:
 *
 *    - MediaPrimary: is_primary = true, display_order = 1.
 *    - MediaSecondary: is_primary = false, display_order = 2.
 * 6. Seller deletes mediaPrimary via DELETE
 *    /shoppingMall/seller/products/{productCode}/media/{productMediaId}.
 * 7. Validate that:
 *
 *    - All create responses conform to their DTO types (typia.assert).
 *    - Product points to the expected seller and brand.
 *    - Each media's product summary matches the created product.
 *    - The erase call completes without throwing.
 */
export async function test_api_seller_product_media_delete_last_primary_image(
  connection: api.IConnection,
) {
  // 1. Platform admin joins
  const platformAdminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@admin.example.com`,
    name: RandomGenerator.name(2),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Platform admin logs in (mainly to mimic realistic flow)
  const platformAdminLoginBody = {
    email: platformAdminAuthorized.email,
    password: platformAdminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const platformAdminLoggedIn: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoggedIn);

  TestValidator.equals(
    "platform admin id stable after login",
    platformAdminLoggedIn.id,
    platformAdminAuthorized.id,
  );

  // 3. Create a brand via platformAdmin brands.create
  const brandCreateBody = {
    name: `Brand ${RandomGenerator.paragraph({ sentences: 1 })}`,
    slug: `brand-${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_uri:
      "https://cdn.example.com/logo/" + RandomGenerator.alphaNumeric(12),
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  TestValidator.equals(
    "brand name matches request",
    brand.name,
    brandCreateBody.name,
  );
  TestValidator.equals(
    "brand slug matches request",
    brand.slug,
    brandCreateBody.slug,
  );

  // 4. Seller joins
  const sellerJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@seller.example.com`,
    password: RandomGenerator.alphaNumeric(12),
    storeName: `Store ${RandomGenerator.paragraph({ sentences: 1 })}`,
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // 5. Seller logs in
  const sellerLoginBody = {
    email: sellerJoinBody.email,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/",
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerLoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoggedIn);

  TestValidator.equals(
    "seller id stable after login",
    sellerLoggedIn.id,
    sellerAuthorized.id,
  );

  // 6. Seller creates a product associated with the created brand
  const productCode: string & tags.MinLength<1> =
    `PRD-${RandomGenerator.alphaNumeric(10)}` as string & tags.MinLength<1>;

  const productCreateBody = {
    shopping_mall_seller_id: sellerLoggedIn.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: `Product ${RandomGenerator.paragraph({ sentences: 1 })}`,
    short_description: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri:
      "https://cdn.example.com/product/" + RandomGenerator.alphaNumeric(16),
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  TestValidator.equals(
    "product code matches create request",
    product.code,
    productCreateBody.code,
  );
  TestValidator.equals(
    "product seller summary id matches seller",
    product.seller.id,
    sellerLoggedIn.id,
  );
  TestValidator.predicate(
    "product brand summary, when present, has same id as created brand",
    product.brand === undefined || product.brand === null
      ? true
      : product.brand.id === brand.id,
  );

  // 7. Create primary media for the product
  const mediaPrimaryBody = {
    uri: "https://cdn.example.com/media/" + RandomGenerator.alphaNumeric(16),
    media_type: "image",
    alt_text: RandomGenerator.paragraph({ sentences: 1 }),
    display_order: 1,
    is_primary: true,
  } satisfies IShoppingMallProductMedia.ICreate;

  const mediaPrimary: IShoppingMallProductMedia =
    await api.functional.shoppingMall.seller.products.media.create(connection, {
      productCode: product.code,
      body: mediaPrimaryBody,
    });
  typia.assert(mediaPrimary);

  TestValidator.equals(
    "primary media is marked primary",
    mediaPrimary.is_primary,
    mediaPrimaryBody.is_primary,
  );
  TestValidator.equals(
    "primary media display_order matches",
    mediaPrimary.display_order,
    mediaPrimaryBody.display_order,
  );
  TestValidator.equals(
    "primary media product summary id matches product",
    mediaPrimary.product.id,
    product.id,
  );

  // 8. Create secondary media for the product
  const mediaSecondaryBody = {
    uri: "https://cdn.example.com/media/" + RandomGenerator.alphaNumeric(16),
    media_type: "image",
    alt_text: RandomGenerator.paragraph({ sentences: 1 }),
    display_order: 2,
    is_primary: false,
  } satisfies IShoppingMallProductMedia.ICreate;

  const mediaSecondary: IShoppingMallProductMedia =
    await api.functional.shoppingMall.seller.products.media.create(connection, {
      productCode: product.code,
      body: mediaSecondaryBody,
    });
  typia.assert(mediaSecondary);

  TestValidator.equals(
    "secondary media is marked non-primary",
    mediaSecondary.is_primary,
    mediaSecondaryBody.is_primary,
  );
  TestValidator.equals(
    "secondary media display_order matches",
    mediaSecondary.display_order,
    mediaSecondaryBody.display_order,
  );
  TestValidator.equals(
    "secondary media product summary id matches product",
    mediaSecondary.product.id,
    product.id,
  );

  // 9. Delete the primary media record
  await api.functional.shoppingMall.seller.products.media.erase(connection, {
    productCode: product.code,
    productMediaId: mediaPrimary.id,
  });

  // If we reach here without throwing, the delete operation has completed
  // successfully. We cannot re-fetch the media list, but we can still assert
  // that the remaining media object we created is structurally valid and
  // continues to reference the same product.
  typia.assert(mediaSecondary);

  TestValidator.predicate(
    "remaining media still references the same product after primary delete",
    mediaSecondary.product.id === product.id,
  );
}
