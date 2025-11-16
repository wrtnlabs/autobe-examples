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
 * Verify that a seller cannot delete media assets belonging to another seller's
 * product.
 *
 * Business context: In this shopping mall platform, product media management is
 * restricted to the owning seller (or privileged platform actors). Deleting a
 * media asset from a product should therefore be prohibited when attempted by a
 * different seller who does not own the product.
 *
 * Test flow:
 *
 * 1. Bootstrap a platform admin and (optionally) a brand.
 * 2. Register Seller A and create a product under Seller A.
 * 3. Create a media asset for Seller A's product.
 * 4. Register Seller B as a distinct seller.
 * 5. As Seller B, attempt to delete the media asset belonging to Seller A's
 *    product.
 * 6. Assert that the delete attempt fails with an error (authorization/ownership
 *    enforcement).
 *
 * Note: No media read/list API is provided in the SDK, so the test focuses on
 * verifying that the cross-seller delete attempt fails rather than re-fetching
 * the media state.
 */
export async function test_api_seller_product_media_delete_unauthorized_seller(
  connection: api.IConnection,
) {
  // 1. Platform admin join (for potential future use, and to follow dependency list).
  const platformAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 1-1. Optionally create a brand as platform admin (not strictly required for the test).
  const brandCreateBody = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphaNumeric(16),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    logo_uri: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 2. Register Seller A and keep its id for product ownership.
  const sellerAJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerA: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerAJoinBody,
    });
  typia.assert(sellerA);

  // 3. Seller A creates a product.
  const productCode: string & tags.MinLength<1> = RandomGenerator.alphaNumeric(
    12,
  ) as string & tags.MinLength<1>;
  const productCreateBody = {
    shopping_mall_seller_id: sellerA.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: RandomGenerator.name(3) as string & tags.MinLength<1>,
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: false,
    primary_image_uri: typia.random<string & tags.Format<"uri">>(),
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // Ensure that the created product code matches what we sent.
  TestValidator.equals(
    "created product code should match requested code",
    product.code,
    productCode,
  );

  // 4. Seller A creates a product media asset.
  const mediaCreateBody = {
    uri: typia.random<string & tags.Format<"uri">>(),
    media_type: "image",
    alt_text: RandomGenerator.paragraph({ sentences: 2 }),
    display_order: 1 as number & tags.Type<"int32">,
    is_primary: true,
  } satisfies IShoppingMallProductMedia.ICreate;

  const media: IShoppingMallProductMedia =
    await api.functional.shoppingMall.seller.products.media.create(connection, {
      productCode: product.code,
      body: mediaCreateBody,
    });
  typia.assert(media);

  // 5. Register Seller B (a different seller).
  const sellerBJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerB: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerBJoinBody,
    });
  typia.assert(sellerB);

  // 6. As Seller B, attempt to delete Seller A's media and expect an error.
  await TestValidator.error(
    "unauthorized seller cannot delete another seller's product media",
    async () => {
      await api.functional.shoppingMall.seller.products.media.erase(
        connection,
        {
          productCode: product.code,
          productMediaId: media.id,
        },
      );
    },
  );
}
