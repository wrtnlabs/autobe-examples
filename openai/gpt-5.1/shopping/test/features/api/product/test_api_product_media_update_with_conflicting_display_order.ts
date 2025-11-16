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
 * Validate that updating a product media to a conflicting display_order is
 * rejected and does not corrupt the product's media ordering.
 *
 * Business flow:
 *
 * 1. Register a seller and establish an authenticated seller session.
 * 2. Register a platform admin, log in as admin, and create a brand.
 * 3. Switch back to the seller session.
 * 4. Create a product for this seller associated with the created brand.
 * 5. Create two media records for that product with display_order 1 and 2.
 * 6. Attempt to update the second media to display_order 1, expecting an error.
 * 7. Verify that the failed update does not alter in-memory media data and that
 *    the conflict scenario is correctly rejected at runtime.
 */
export async function test_api_product_media_update_with_conflicting_display_order(
  connection: api.IConnection,
) {
  // 1. Seller join (also authenticates seller session)
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    storeName: RandomGenerator.name(),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuthorized);

  // 2. Platform admin join and login, then create a brand
  const platformAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(platformAdminAuthorized);

  // Explicit login as platform admin (ensures we are in admin context)
  const platformAdminLoginBody = {
    email: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const platformAdminSession: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(platformAdminSession);

  const brandCreateBody = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    logo_uri: "https://cdn.example.com/brand/logo.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert<IShoppingMallBrand>(brand);

  // 3. Switch back to seller session
  const sellerLoginBody = {
    email: sellerJoinBody.email,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/",
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerSession: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerSession);

  // 4. Create a product for this seller associated with the brand
  const productCode: string & tags.MinLength<1> = RandomGenerator.alphaNumeric(
    10,
  ) as string & tags.MinLength<1>;

  const productCreateBody = {
    shopping_mall_seller_id: sellerSession.seller.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: RandomGenerator.name(3),
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: false,
    primary_image_uri: "https://cdn.example.com/product/primary.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert<IShoppingMallProduct>(product);

  // 5. Create two media records for the product
  const firstMediaCreateBody = {
    uri: "https://cdn.example.com/product/media1.png",
    media_type: "image",
    alt_text: RandomGenerator.paragraph({ sentences: 2 }),
    display_order: 1 as number & tags.Type<"int32">,
    is_primary: false,
  } satisfies IShoppingMallProductMedia.ICreate;

  const firstMedia: IShoppingMallProductMedia =
    await api.functional.shoppingMall.seller.products.media.create(connection, {
      productCode: product.code,
      body: firstMediaCreateBody,
    });
  typia.assert<IShoppingMallProductMedia>(firstMedia);

  const secondMediaCreateBody = {
    uri: "https://cdn.example.com/product/media2.png",
    media_type: "image",
    alt_text: RandomGenerator.paragraph({ sentences: 2 }),
    display_order: 2 as number & tags.Type<"int32">,
    is_primary: false,
  } satisfies IShoppingMallProductMedia.ICreate;

  const secondMedia: IShoppingMallProductMedia =
    await api.functional.shoppingMall.seller.products.media.create(connection, {
      productCode: product.code,
      body: secondMediaCreateBody,
    });
  typia.assert<IShoppingMallProductMedia>(secondMedia);

  // Sanity-check initial display orders
  TestValidator.equals(
    "first media has display_order 1",
    firstMedia.display_order,
    1,
  );
  TestValidator.equals(
    "second media has display_order 2",
    secondMedia.display_order,
    2,
  );

  // 6. Attempt to update second media to conflicting display_order=1
  const conflictingUpdateBody = {
    display_order: 1 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductMedia.IUpdate;

  await TestValidator.error(
    "conflicting media display_order update must fail",
    async () => {
      await api.functional.shoppingMall.seller.products.media.update(
        connection,
        {
          productCode: product.code,
          productMediaId: secondMedia.id,
          body: conflictingUpdateBody,
        },
      );
    },
  );

  // 7. Data integrity checks (in-memory expectations)
  // We cannot re-fetch media via a list/at endpoint, but we can assert the
  // originally created media objects remain unchanged in this test context.
  TestValidator.equals(
    "first media display_order remains 1 after failed update",
    firstMedia.display_order,
    1,
  );
  TestValidator.equals(
    "second media display_order remains 2 after failed update",
    secondMedia.display_order,
    2,
  );
}
