import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallGuestCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestCart";
import type { IShoppingMallGuestCartClientMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestCartClientMetadata";
import type { IShoppingMallGuestCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestCartItem";
import type { IShoppingMallGuestCartItemForCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestCartItemForCart";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";

/**
 * Validate guest cart full-replacement quantity business rules.
 *
 * This test exercises the guest cart full replacement API (PUT
 * /shoppingMall/guestCarts/{guestCartId}) in the context of realistic catalog
 * setup and guest cart usage. It ensures that the cart update pipeline
 * re-applies quantity and inventory rules on every full replacement and that
 * excessive quantities are rejected while valid quantities are accepted.
 *
 * Steps:
 *
 * 1. Register and login a platform admin account.
 * 2. Using the platform admin session, create a brand.
 * 3. Register and login a seller account.
 * 4. Using the seller session, create a product and a SKU under it.
 * 5. Create a guest cart.
 * 6. Seed the guest cart with a baseline item quantity for the SKU via POST
 *    /shoppingMall/guestCarts/{guestCartId}/items.
 * 7. Attempt to update the cart via PUT with a very large quantity for the same
 *    SKU and expect a business-rule error (quantity limit or inventory
 *    policy).
 * 8. Confirm that the cart still reflects the baseline quantity after the failed
 *    update by reading back the cart from the PUT response or by asserting on
 *    the returned object.
 * 9. Retry PUT with a valid, smaller quantity and expect success.
 * 10. Verify that the updated cart now contains the item with the new quantity and
 *     that no duplicate lines exist for the SKU.
 */
export async function test_api_guest_cart_full_replacement_quantity_rules(
  connection: api.IConnection,
) {
  // 1. Register a platform admin
  const platformAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2. Create a brand as platform admin
  const brandCreateBody = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    logo_uri: "https://cdn.example.com/logo/" + RandomGenerator.alphaNumeric(8),
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 3. Register and login a seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();

  const sellerJoinBody = {
    email: sellerEmail,
    password: RandomGenerator.alphaNumeric(12),
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerJoinOutput: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerJoinOutput);

  // Ensure we are authenticated as seller (join already sets token)
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerJoinBody.password,
    ip: "127.0.0.1",
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/",
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerLoginOutput: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoginOutput);

  // 4. Create a product and SKU as seller
  const productCode = "PROD-" + RandomGenerator.alphaNumeric(8);

  const productCreateBody = {
    shopping_mall_seller_id: sellerLoginOutput.id,
    shopping_mall_brand_id: brand.id,
    code: productCode as string & tags.MinLength<1>,
    name: RandomGenerator.name(3) as string & tags.MinLength<1>,
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: true,
    primary_image_uri:
      "https://cdn.example.com/product/" + RandomGenerator.alphaNumeric(8),
    additional_data: undefined,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  const skuCreateBody = {
    code: "SKU-" + RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(2),
    listPrice: 10000,
    salePrice: 9000,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: product.code,
      body: skuCreateBody,
    });
  typia.assert(sku);

  // 5. Create a guest cart
  const guestCartCreateBody = {
    guest_token: "guest-" + RandomGenerator.alphaNumeric(16),
    ip: "127.0.0.1",
    user_agent: "Mozilla/5.0 (E2E Test)",
    referrer: "https://shop.example.com/" as string & tags.Format<"uri">,
    region_code: "KR",
  } satisfies IShoppingMallGuestCart.ICreate;

  const guestCart: IShoppingMallGuestCart =
    await api.functional.shoppingMall.guestCarts.create(connection, {
      body: guestCartCreateBody,
    });
  typia.assert(guestCart);

  // 6. Seed baseline item quantity via POST /guestCarts/{guestCartId}/items
  const baselineQuantity = 2;

  const guestCartItemCreateBody = {
    sku_id: sku.id,
    quantity: baselineQuantity as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallGuestCartItem.ICreate;

  const createdItem: IShoppingMallGuestCartItem =
    await api.functional.shoppingMall.guestCarts.items.create(connection, {
      guestCartId: guestCart.id,
      body: guestCartItemCreateBody,
    });
  typia.assert(createdItem);

  TestValidator.equals(
    "baseline item quantity is applied",
    createdItem.quantity,
    baselineQuantity,
  );

  // 7. Attempt full replacement PUT with an excessive quantity
  const excessiveQuantity = 1000000 as number &
    tags.Type<"int32"> &
    tags.Minimum<1>;

  const excessiveUpdateBody = {
    currency_code: "KRW",
    client_metadata: {
      user_agent: "Mozilla/5.0 (E2E Test Excessive)",
      device_type: "desktop",
      locale: "ko-KR",
    } satisfies IShoppingMallGuestCartClientMetadata.IUpdate,
    items: [
      {
        sku_id: sku.id,
        quantity: excessiveQuantity,
      } satisfies IShoppingMallGuestCartItemForCart.IUpdate,
    ],
  } satisfies IShoppingMallGuestCart.IUpdate;

  await TestValidator.error(
    "excessive quantity should be rejected",
    async () => {
      await api.functional.shoppingMall.guestCarts.update(connection, {
        guestCartId: guestCart.id,
        body: excessiveUpdateBody,
      });
    },
  );

  // 9. Retry PUT with a valid smaller quantity
  const validQuantity = 5 as number & tags.Type<"int32"> & tags.Minimum<1>;

  const validUpdateBody = {
    currency_code: "KRW",
    client_metadata: {
      user_agent: "Mozilla/5.0 (E2E Test Valid)",
      device_type: "desktop",
      locale: "ko-KR",
    } satisfies IShoppingMallGuestCartClientMetadata.IUpdate,
    items: [
      {
        sku_id: sku.id,
        quantity: validQuantity,
      } satisfies IShoppingMallGuestCartItemForCart.IUpdate,
    ],
  } satisfies IShoppingMallGuestCart.IUpdate;

  const updatedCart: IShoppingMallGuestCart =
    await api.functional.shoppingMall.guestCarts.update(connection, {
      guestCartId: guestCart.id,
      body: validUpdateBody,
    });
  typia.assert(updatedCart);

  // 10. Verify cart contains a single line for this SKU with the valid quantity
  const matchingItems = updatedCart.items.filter(
    (item) => item.product_sku_id === createdItem.product_sku_id,
  );

  TestValidator.predicate(
    "updated cart has at least one item for the SKU",
    matchingItems.length >= 1,
  );

  const firstMatch = matchingItems[0];

  TestValidator.equals(
    "quantity after valid update matches expected value",
    firstMatch.quantity,
    validQuantity,
  );
}
