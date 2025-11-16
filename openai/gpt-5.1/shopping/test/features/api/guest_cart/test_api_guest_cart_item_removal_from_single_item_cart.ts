import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallGuestCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallGuestCartItem";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallGuestCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestCart";
import type { IShoppingMallGuestCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestCartItem";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";

/**
 * Validate deletion of a single guest cart item from a guest cart.
 *
 * Business context:
 *
 * - Guest carts are used by unauthenticated visitors to accumulate items before
 *   login/registration.
 * - Cart items are backed by catalog products/SKUs that are managed by
 *   authenticated actors (platformAdmin and seller).
 * - The erase endpoint must delete only the targeted line item while leaving the
 *   guest cart itself intact.
 *
 * Scenario steps:
 *
 * 1. Register and login a platform admin.
 * 2. Platform admin creates a brand to associate with a product.
 * 3. Register and login a seller.
 * 4. Seller creates a product referencing the created brand and with is_multi_sku
 *    = true.
 * 5. Seller creates a SKU for that product.
 * 6. As an unauthenticated guest, create a guest cart.
 * 7. Add a single item to the guest cart for the created SKU.
 * 8. List items for that guest cart and verify the single item exists.
 * 9. Call erase on that item.
 * 10. List items again and confirm that the cart is now empty and the deleted item
 *     no longer appears.
 */
export async function test_api_guest_cart_item_removal_from_single_item_cart(
  connection: api.IConnection,
) {
  // 1. Platform admin join
  const platformAdminJoinBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@admin.test.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: `https://admin.test.com/${RandomGenerator.alphaNumeric(8)}`,
    referrer: "https://admin.test.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Platform admin login (exercise login path and ensure token is set)
  const platformAdminLoginBody = {
    email: platformAdminAuthorized.email,
    password: platformAdminJoinBody.password,
    ip: null,
    href: `https://admin.test.com/login/${RandomGenerator.alphaNumeric(4)}`,
    referrer: "https://admin.test.com/",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const platformAdminLoggedIn: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoggedIn);

  // 3. Platform admin creates a brand
  const brandCreateBody = {
    name: `Brand ${RandomGenerator.name(1)}`,
    slug: `brand-${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 4 }),
    logo_uri: `https://cdn.test.com/logo/${RandomGenerator.alphaNumeric(8)}.png`,
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 4. Seller join
  const sellerJoinBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@seller.test.com`,
    password: RandomGenerator.alphaNumeric(12),
    storeName: `Store ${RandomGenerator.name(1)}`,
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // 5. Seller login (ensure seller token is active)
  const sellerLoginBody = {
    email: sellerJoinBody.email,
    password: sellerJoinBody.password,
    ip: null,
    href: `https://seller.test.com/login/${RandomGenerator.alphaNumeric(4)}`,
    referrer: "https://seller.test.com/",
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerLoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoggedIn);

  // 6. Seller creates a product under their seller id, referencing the brand
  const productCode = `PROD-${RandomGenerator.alphaNumeric(10)}`;

  const productCreateBody = {
    shopping_mall_seller_id: sellerLoggedIn.id,
    shopping_mall_brand_id: brand.id,
    code: productCode as string & tags.MinLength<1>,
    name: `Product ${RandomGenerator.name(1)}` as string & tags.MinLength<1>,
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: true,
    primary_image_uri: `https://cdn.test.com/product/${RandomGenerator.alphaNumeric(8)}.jpg`,
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 7. Seller creates a SKU for that product
  const skuCode = `SKU-${RandomGenerator.alphaNumeric(10)}`;

  const skuCreateBody = {
    code: skuCode,
    name: `SKU ${RandomGenerator.name(1)}`,
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

  // 8. As guest (no auth requirement), create a guest cart
  const unauthConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  const guestCartCreateBody = {
    guest_token: RandomGenerator.alphaNumeric(24),
    ip: undefined,
    user_agent: undefined,
    referrer: undefined,
    region_code: "KR" as string,
  } satisfies IShoppingMallGuestCart.ICreate;

  const guestCart: IShoppingMallGuestCart =
    await api.functional.shoppingMall.guestCarts.create(unauthConnection, {
      body: guestCartCreateBody,
    });
  typia.assert(guestCart);

  // 9. Add a single item to the guest cart referencing the created SKU
  const guestCartItemCreateBody = {
    sku_id: sku.id,
    quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallGuestCartItem.ICreate;

  const createdItem: IShoppingMallGuestCartItem =
    await api.functional.shoppingMall.guestCarts.items.create(
      unauthConnection,
      {
        guestCartId: guestCart.id,
        body: guestCartItemCreateBody,
      },
    );
  typia.assert(createdItem);

  // 10. List items before deletion and verify there is exactly one item
  const beforePage: IPageIShoppingMallGuestCartItem.ISummary =
    await api.functional.shoppingMall.guestCarts.items.index(unauthConnection, {
      guestCartId: guestCart.id,
    });
  typia.assert(beforePage);

  TestValidator.equals(
    "single item should exist before deletion",
    beforePage.pagination.records,
    1,
  );
  TestValidator.equals(
    "data length should be 1 before deletion",
    beforePage.data.length,
    1,
  );

  const beforeItem = beforePage.data[0];
  TestValidator.equals(
    "created item id should match listed item id",
    beforeItem.id,
    createdItem.id,
  );
  TestValidator.equals(
    "guest cart id on item should match cart id",
    beforeItem.guest_cart_id,
    guestCart.id,
  );

  // 11. Delete the item using erase
  await api.functional.shoppingMall.guestCarts.items.erase(unauthConnection, {
    guestCartId: guestCart.id as string & tags.Format<"uuid">,
    guestCartItemId: createdItem.id as string & tags.Format<"uuid">,
  });

  // 12. List items after deletion and confirm the cart is empty
  const afterPage: IPageIShoppingMallGuestCartItem.ISummary =
    await api.functional.shoppingMall.guestCarts.items.index(unauthConnection, {
      guestCartId: guestCart.id,
    });
  typia.assert(afterPage);

  TestValidator.equals(
    "no items should remain after deletion (records)",
    afterPage.pagination.records,
    0,
  );
  TestValidator.equals(
    "no items should remain after deletion (data length)",
    afterPage.data.length,
    0,
  );
}
