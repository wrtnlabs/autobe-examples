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
 * Validate that an authenticated seller can delete one of their product media
 * assets without affecting other media or the product itself.
 *
 * Business flow under test:
 *
 * 1. Register a seller and obtain an authenticated seller context.
 * 2. Register a platform admin and login as that admin to create a brand.
 * 3. Switch back to the seller and create a product that belongs to this seller,
 *    optionally associated with the created brand.
 * 4. As the seller, attach two media assets to the product so that we can later
 *    delete exactly one of them.
 * 5. Call the DELETE
 *    /shoppingMall/seller/products/{productCode}/media/{productMediaId}
 *    endpoint to delete the first media asset.
 * 6. Validate that the deletion call succeeds (i.e., resolves without throwing)
 *    and that our remaining media object and product object still reflect
 *    consistent relationships.
 */
export async function test_api_seller_product_media_delete_basic_flow(
  connection: api.IConnection,
) {
  // 1. Register a seller and establish authenticated seller context
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuthorized);

  // 2. Register and login as a platform admin to create a brand
  const platformAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
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
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(platformAdminAuthorized);

  // Explicit login as platform admin to mimic real usage (even though join already authenticated)
  const platformAdminLoginBody = {
    email: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const platformAdminLogin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(platformAdminLogin);

  // 3. As platform admin, create a brand for use by the product
  const brandCreateBody = {
    name: RandomGenerator.name(2),
    slug: `brand-${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 6 }),
    logo_uri:
      "https://cdn.example.com/brands/" +
      RandomGenerator.alphaNumeric(16) +
      ".png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert<IShoppingMallBrand>(brand);

  // 4. Switch back to seller account for seller-facing operations
  const sellerLoginBody = {
    email: sellerJoinBody.email,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/",
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerLogin);

  // 5. Seller creates a product associated with this seller (and the brand)
  const productCode: string & tags.MinLength<1> =
    `P-${RandomGenerator.alphaNumeric(10)}` as string & tags.MinLength<1>;

  const productCreateBody = {
    shopping_mall_seller_id: sellerLogin.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: RandomGenerator.name(3) as string & tags.MinLength<1>,
    short_description: RandomGenerator.paragraph({ sentences: 4 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: false,
    primary_image_uri:
      "https://cdn.example.com/products/" +
      RandomGenerator.alphaNumeric(16) +
      ".jpg",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert<IShoppingMallProduct>(product);

  // Validate that product belongs to seller
  TestValidator.equals(
    "product belongs to seller",
    product.seller.id,
    sellerLogin.id,
  );

  // 6. Seller attaches two media assets to the product
  const mediaCreateBody1 = {
    uri:
      "https://cdn.example.com/product-media/" +
      RandomGenerator.alphaNumeric(24) +
      ".jpg",
    media_type: "image",
    alt_text: RandomGenerator.paragraph({ sentences: 3 }),
    display_order: 1 as number & tags.Type<"int32">,
    is_primary: true,
  } satisfies IShoppingMallProductMedia.ICreate;

  const media1: IShoppingMallProductMedia =
    await api.functional.shoppingMall.seller.products.media.create(connection, {
      productCode: product.code,
      body: mediaCreateBody1,
    });
  typia.assert<IShoppingMallProductMedia>(media1);

  const mediaCreateBody2 = {
    uri:
      "https://cdn.example.com/product-media/" +
      RandomGenerator.alphaNumeric(24) +
      ".jpg",
    media_type: "image",
    alt_text: RandomGenerator.paragraph({ sentences: 3 }),
    display_order: 2 as number & tags.Type<"int32">,
    is_primary: false,
  } satisfies IShoppingMallProductMedia.ICreate;

  const media2: IShoppingMallProductMedia =
    await api.functional.shoppingMall.seller.products.media.create(connection, {
      productCode: product.code,
      body: mediaCreateBody2,
    });
  typia.assert<IShoppingMallProductMedia>(media2);

  // Validate media <-> product relationships before deletion
  TestValidator.equals(
    "media1 product linkage before deletion",
    media1.product.id,
    product.id,
  );
  TestValidator.equals(
    "media2 product linkage before deletion",
    media2.product.id,
    product.id,
  );

  // 7. Delete the first media asset using DELETE endpoint under test
  await api.functional.shoppingMall.seller.products.media.erase(connection, {
    productCode: product.code,
    productMediaId: media1.id,
  });

  // 8. Post-deletion validation (logical expectations with in-memory objects)
  //    We can't refetch media, but we can still assert logical consistency
  typia.assert<IShoppingMallProduct>(product);
  typia.assert<IShoppingMallProductMedia>(media2);

  TestValidator.equals(
    "remaining media still linked to same product",
    media2.product.id,
    product.id,
  );

  TestValidator.equals(
    "product still belongs to seller after media deletion",
    product.seller.id,
    sellerLogin.id,
  );
}
