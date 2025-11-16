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
 * Verify that product media creation enforces unique display_order per product.
 *
 * Business goal:
 *
 * - Ensure that when a seller creates media assets for a product, the
 *   display_order value behaves like a unique position within that product's
 *   gallery. Attempting to create a second media entry with the same
 *   display_order for the same product should fail with a business error and
 *   must not create a duplicate record.
 *
 * High level workflow:
 *
 * 1. Bootstrap authentication actors
 *
 *    - Join as a platform admin and log in (so that brand creation is permitted).
 *    - Join as a seller (seller join also yields an authorized session via the SDK;
 *         we can later call seller login again if desired).
 * 2. As platform admin, create a brand record using POST
 *    /shoppingMall/platformAdmin/brands.
 * 3. As seller, create a product bound to this seller and brand using POST
 *    /shoppingMall/seller/products with IShoppingMallProduct.ICreate.
 * 4. Create a first product media entry for this product via POST
 *    /shoppingMall/seller/products/{productCode}/media with display_order = 1;
 *    assert success and type.
 * 5. Attempt a second media.create for the same productCode with the same
 *    display_order (1) but different URI/alt_text. Wrap this in
 *    TestValidator.error and assert that it fails, indicating that the
 *    duplicate display_order is rejected.
 * 6. Because no listing endpoint for media is available in the provided SDK, skip
 *    post-conditions on the full gallery and rely on "first success, second
 *    failure" semantics as evidence that uniqueness is enforced.
 */
export async function test_api_product_media_creation_with_conflicting_display_order(
  connection: api.IConnection,
) {
  // 1. Join as platform admin (creates admin identity and logs in)
  const platformAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
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

  // 2. Create a brand as platform admin
  const brandCreateBody = {
    name: RandomGenerator.name(1),
    slug: RandomGenerator.alphaNumeric(16),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    logo_uri: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 3. Join as seller (seller join also authenticates the seller and sets token)
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    storeName: RandomGenerator.name(1),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // 4. Create a product for this seller using the created brand
  const productCode: string & tags.MinLength<1> = RandomGenerator.alphaNumeric(
    10,
  ) as string & tags.MinLength<1>;

  const productCreateBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: RandomGenerator.name(2) as string & tags.MinLength<1>,
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
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

  TestValidator.equals(
    "created product code matches requested code",
    product.code,
    productCode,
  );

  // 5. Create first media entry with display_order = 1
  const firstMediaBody = {
    uri: typia.random<string & tags.Format<"uri">>(),
    media_type: "image",
    alt_text: RandomGenerator.paragraph({ sentences: 3 }),
    display_order: 1 as number & tags.Type<"int32">,
    is_primary: true,
  } satisfies IShoppingMallProductMedia.ICreate;

  const firstMedia: IShoppingMallProductMedia =
    await api.functional.shoppingMall.seller.products.media.create(connection, {
      productCode: product.code,
      body: firstMediaBody,
    });
  typia.assert(firstMedia);

  TestValidator.equals(
    "first media display_order is 1",
    firstMedia.display_order,
    1 as number & tags.Type<"int32">,
  );

  // 6. Attempt to create second media with the same display_order for the same product
  const secondMediaBody = {
    uri: typia.random<string & tags.Format<"uri">>(),
    media_type: "image",
    alt_text: RandomGenerator.paragraph({ sentences: 4 }),
    display_order: 1 as number & tags.Type<"int32">,
    is_primary: false,
  } satisfies IShoppingMallProductMedia.ICreate;

  await TestValidator.error(
    "duplicate display_order for same product should be rejected",
    async () => {
      await api.functional.shoppingMall.seller.products.media.create(
        connection,
        {
          productCode: product.code,
          body: secondMediaBody,
        },
      );
    },
  );
}
