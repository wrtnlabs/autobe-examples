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
 * Validate primary media creation and switching behavior for a seller product.
 *
 * Business context:
 *
 * - A platform admin can create brands.
 * - A seller can create products associated with a brand using a unique product
 *   code.
 * - The seller can then attach media assets to the product, marking one as
 *   primary.
 * - Creating another media as primary is expected to make that media primary
 *   according to business rules (only one primary per product), although we
 *   cannot reload the full media set with the provided SDK. We therefore
 *   validate using the individual responses.
 *
 * Steps:
 *
 * 1. Platform admin joins and logs in.
 * 2. Platform admin creates a brand with realistic fields.
 * 3. Seller joins and logs in.
 * 4. Seller creates a product with a chosen unique product code and associates the
 *    brand.
 * 5. Seller creates first media with is_primary=true and display_order=1 for that
 *    product.
 * 6. Seller creates second media with is_primary=true and display_order=2 for the
 *    same product.
 * 7. Validate both responses via typia.assert and business-level assertions:
 *
 *    - Both media items belong to the created product (product.id and product.name
 *         consistency).
 *    - First media has display_order=1 and is_primary=true as requested.
 *    - Second media has display_order=2 and is_primary=true as requested.
 *
 * Note:
 *
 * - No list/read API for product media is provided, so we cannot directly assert
 *   that the first media lost its primary status on the server. We restrict
 *   validation to response correctness and per-call primary flag behavior.
 */
export async function test_api_product_media_creation_with_primary_flag_switching(
  connection: api.IConnection,
) {
  // 1. Platform admin joins
  const platformAdminJoinBody = {
    email: `admin+${RandomGenerator.alphabets(8)}@example.com`,
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

  // 2. Platform admin login (explicitly test login flow too)
  const platformAdminLoginBody = {
    email: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const platformAdminLoginOutput: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoginOutput);

  // 3. Platform admin creates a brand
  const brandCreateBody = {
    name: `Brand ${RandomGenerator.name(1)}`,
    slug: `brand-${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
    logo_uri:
      "https://cdn.example.com/logo/" +
      RandomGenerator.alphaNumeric(12) +
      ".png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 4. Seller joins
  const sellerJoinBody = {
    email: `seller+${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    storeName: `Store ${RandomGenerator.name(1)}`,
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // 5. Seller login (explicitly test login flow too)
  const sellerLoginBody = {
    email: sellerJoinBody.email,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/",
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerLoginOutput: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoginOutput);

  // 6. Seller creates a product associated to the brand
  const productCode: string & tags.MinLength<1> = ("P-" +
    RandomGenerator.alphaNumeric(10)) as string & tags.MinLength<1>;

  const productCreateBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: `Product ${RandomGenerator.name(1)}` as string & tags.MinLength<1>,
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: false,
    primary_image_uri: null,
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  TestValidator.equals(
    "created product code should match request code",
    product.code,
    productCreateBody.code,
  );
  TestValidator.equals(
    "created product seller id should match authenticated seller",
    product.seller.id,
    sellerAuthorized.id,
  );

  // 7. Seller creates first primary media for the product
  const firstMediaBody = {
    uri:
      "https://cdn.example.com/products/" +
      product.code +
      "/media1-" +
      RandomGenerator.alphaNumeric(8) +
      ".jpg",
    media_type: "image",
    alt_text: RandomGenerator.paragraph({ sentences: 2 }),
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
    "first media product id should match created product",
    firstMedia.product.id,
    product.id,
  );
  TestValidator.equals(
    "first media display_order should be 1",
    firstMedia.display_order,
    firstMediaBody.display_order,
  );
  TestValidator.equals(
    "first media should be primary as requested",
    firstMedia.is_primary,
    true,
  );

  // 8. Seller creates second primary media for the same product
  const secondMediaBody = {
    uri:
      "https://cdn.example.com/products/" +
      product.code +
      "/media2-" +
      RandomGenerator.alphaNumeric(8) +
      ".jpg",
    media_type: "image",
    alt_text: RandomGenerator.paragraph({ sentences: 2 }),
    display_order: 2 as number & tags.Type<"int32">,
    is_primary: true,
  } satisfies IShoppingMallProductMedia.ICreate;

  const secondMedia: IShoppingMallProductMedia =
    await api.functional.shoppingMall.seller.products.media.create(connection, {
      productCode: product.code,
      body: secondMediaBody,
    });
  typia.assert(secondMedia);

  TestValidator.equals(
    "second media product id should match created product",
    secondMedia.product.id,
    product.id,
  );
  TestValidator.equals(
    "second media display_order should be 2",
    secondMedia.display_order,
    secondMediaBody.display_order,
  );
  TestValidator.equals(
    "second media should be primary as requested",
    secondMedia.is_primary,
    true,
  );

  // 9. Cross-check that the two media records are distinct and associated with the same product
  TestValidator.notEquals(
    "two media records should have different ids",
    firstMedia.id,
    secondMedia.id,
  );
  TestValidator.equals(
    "product summary in first media should match second media",
    firstMedia.product.id,
    secondMedia.product.id,
  );
}
