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
 * Validate that deleting a non-existent product media fails without affecting
 * existing media or product.
 *
 * Business flow:
 *
 * 1. Create a seller account (join) to obtain an authenticated seller context.
 * 2. Create a platform admin account and login as platform admin.
 * 3. As platform admin, create a brand for use when creating the product.
 * 4. Switch back to the seller context via seller login.
 * 5. Create a product owned by the seller and associated with the created brand.
 * 6. Optionally create a valid media record for the product to ensure there is at
 *    least one real media asset.
 * 7. Generate a random UUID that does not correspond to any existing media id for
 *    the product.
 * 8. Call DELETE
 *    /shoppingMall/seller/products/{productCode}/media/{productMediaId} with
 *    the invalid id, asserting via TestValidator.error that an error is
 *    thrown.
 * 9. Rely on the fact that the failed deletion does not remove existing media or
 *    product; no additional read endpoints are available, so we focus on the
 *    error behavior.
 */
export async function test_api_seller_product_media_delete_nonexistent_media(
  connection: api.IConnection,
) {
  // 1. Seller join to create seller account and authenticated context
  const sellerJoinEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const sellerJoinBody = {
    email: sellerJoinEmail,
    password: RandomGenerator.alphaNumeric(16),
    storeName: RandomGenerator.name(),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorizedFromJoin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorizedFromJoin);

  // 2. Platform admin join and login to be able to create a brand
  const platformAdminJoinEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const platformAdminPassword: string = RandomGenerator.alphaNumeric(20);

  const platformAdminJoinBody = {
    email: platformAdminJoinEmail,
    name: RandomGenerator.name(),
    password: platformAdminPassword,
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminAuthorizedFromJoin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorizedFromJoin);

  const platformAdminLoginBody = {
    email: platformAdminJoinEmail,
    password: platformAdminPassword,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const platformAdminAuthorizedFromLogin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminAuthorizedFromLogin);

  // 3. Create a brand as platform admin
  const brandCreateBody = {
    name: RandomGenerator.name(),
    slug: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    logo_uri:
      "https://cdn.example.com/logo/" + RandomGenerator.alphaNumeric(10),
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 4. Switch back to seller context via seller login
  const sellerLoginBody = {
    email: sellerJoinEmail,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com",
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerAuthorizedFromLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerAuthorizedFromLogin);

  // 5. Create a product owned by the seller and associated with the brand
  const productCode: string & tags.MinLength<1> = RandomGenerator.alphaNumeric(
    12,
  ) as string & tags.MinLength<1>;

  const productCreateBody = {
    shopping_mall_seller_id: sellerAuthorizedFromLogin.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: RandomGenerator.name(),
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: false,
    primary_image_uri:
      "https://cdn.example.com/product/" + RandomGenerator.alphaNumeric(10),
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 6. Optionally create a valid media record for this product
  const mediaCreateBody = {
    uri:
      "https://cdn.example.com/product-media/" +
      RandomGenerator.alphaNumeric(16),
    media_type: "image",
    alt_text: RandomGenerator.paragraph({ sentences: 2 }),
    display_order: 1 as number & tags.Type<"int32">,
    is_primary: true,
  } satisfies IShoppingMallProductMedia.ICreate;

  const validMedia: IShoppingMallProductMedia =
    await api.functional.shoppingMall.seller.products.media.create(connection, {
      productCode: product.code,
      body: mediaCreateBody,
    });
  typia.assert(validMedia);

  // 7. Generate a non-existent productMediaId (ensure it's different from validMedia.id)
  let invalidProductMediaId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  if (invalidProductMediaId === validMedia.id) {
    invalidProductMediaId = typia.random<string & tags.Format<"uuid">>();
  }

  // 8. Attempt to delete non-existent media and assert error
  await TestValidator.error(
    "deleting non-existent product media should fail",
    async () => {
      await api.functional.shoppingMall.seller.products.media.erase(
        connection,
        {
          productCode: product.code,
          productMediaId: invalidProductMediaId,
        },
      );
    },
  );

  // 9. We rely on business guarantees that failure did not affect existing product/media.
}
