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

export async function test_api_guest_cart_item_removal_with_mismatched_cart_and_item(
  connection: api.IConnection,
) {
  // 1. Prepare authentication actors: platform admin and seller.
  const platformAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphabets(12),
    ip: "127.0.0.1",
    href: "https://admin.shoppingmall.local/join",
    referrer: "https://admin.shoppingmall.local/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  const platformAdminLoginBody = {
    email: platformAdmin.email,
    password: platformAdminJoinBody.password,
    ip: "127.0.0.1",
    href: "https://admin.shoppingmall.local/login",
    referrer: "https://admin.shoppingmall.local/",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const platformAdminLoggedIn: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoggedIn);

  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    storeName: RandomGenerator.name(1),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(seller);

  const sellerLoginBody = {
    email: seller.email,
    password: sellerJoinBody.password,
    ip: "127.0.0.1",
    href: "https://seller.shoppingmall.local/login",
    referrer: "https://seller.shoppingmall.local/",
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerLoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoggedIn);

  // 2. Create two guest carts: cartA and cartB.
  const guestCartCreateBodyA = {
    guest_token: RandomGenerator.alphaNumeric(16),
    ip: "192.168.0.10",
    user_agent: "Mozilla/5.0 (CartA)",
    referrer: "https://shoppingmall.local/landing-a" as string &
      tags.Format<"uri">,
    region_code: "KR",
  } satisfies IShoppingMallGuestCart.ICreate;

  const cartA: IShoppingMallGuestCart =
    await api.functional.shoppingMall.guestCarts.create(connection, {
      body: guestCartCreateBodyA,
    });
  typia.assert(cartA);

  const guestCartCreateBodyB = {
    guest_token: RandomGenerator.alphaNumeric(16),
    ip: "192.168.0.11",
    user_agent: "Mozilla/5.0 (CartB)",
    referrer: "https://shoppingmall.local/landing-b" as string &
      tags.Format<"uri">,
    region_code: "KR",
  } satisfies IShoppingMallGuestCart.ICreate;

  const cartB: IShoppingMallGuestCart =
    await api.functional.shoppingMall.guestCarts.create(connection, {
      body: guestCartCreateBodyB,
    });
  typia.assert(cartB);

  // 3. As platform admin, create a brand.
  // (platformAdmin login already set Authorization header)
  const brandCreateBody = {
    name: RandomGenerator.name(1),
    slug: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    logo_uri: "https://cdn.shoppingmall.local/brand/logo.png" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 4. As seller, create a product tied to this brand.
  const productCreateBody = {
    shopping_mall_seller_id: seller.id,
    shopping_mall_brand_id: brand.id,
    code: RandomGenerator.alphaNumeric(10) as string & tags.MinLength<1>,
    name: RandomGenerator.name(2) as string & tags.MinLength<1>,
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: true,
    primary_image_uri:
      "https://cdn.shoppingmall.local/product/primary.png" as string &
        tags.Format<"uri">,
    additional_data: undefined,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 5. Create a SKU under that product.
  const skuCreateBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(1),
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

  // 6. Add one item into cartA using the created SKU.
  const cartItemCreateBodyA = {
    sku_id: sku.id,
    quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallGuestCartItem.ICreate;

  const cartItemA: IShoppingMallGuestCartItem =
    await api.functional.shoppingMall.guestCarts.items.create(connection, {
      guestCartId: cartA.id,
      body: cartItemCreateBodyA,
    });
  typia.assert(cartItemA);

  const cartItemIdA = cartItemA.id;

  // 7. Confirm cartA currently contains the item.
  const pageAInitial: IPageIShoppingMallGuestCartItem.ISummary =
    await api.functional.shoppingMall.guestCarts.items.index(connection, {
      guestCartId: cartA.id,
    });
  typia.assert(pageAInitial);

  const foundInAInitial = pageAInitial.data.find(
    (item) => item.id === cartItemIdA,
  );

  TestValidator.predicate(
    "cartA should contain the created item before mismatched delete",
    foundInAInitial !== undefined,
  );

  // Capture snapshot of quantity and total for later comparison.
  const initialQuantityA = foundInAInitial?.quantity ?? 0;
  const initialLineTotalA = foundInAInitial?.line_total ?? 0;

  // 8. Attempt to delete using cartB.id with cartItemIdA (mismatched pair).
  await TestValidator.error(
    "mismatched cart and item ids should cause erase to fail",
    async () => {
      await api.functional.shoppingMall.guestCarts.items.erase(connection, {
        guestCartId: cartB.id as string & tags.Format<"uuid">,
        guestCartItemId: cartItemIdA as string & tags.Format<"uuid">,
      });
    },
  );

  // 9. Re-fetch items for cartA and confirm the item still exists unchanged.
  const pageAAfter: IPageIShoppingMallGuestCartItem.ISummary =
    await api.functional.shoppingMall.guestCarts.items.index(connection, {
      guestCartId: cartA.id,
    });
  typia.assert(pageAAfter);

  const foundInAAfter = pageAAfter.data.find((item) => item.id === cartItemIdA);

  TestValidator.predicate(
    "cartA item should still exist after mismatched delete attempt",
    foundInAAfter !== undefined,
  );

  if (foundInAAfter !== undefined) {
    TestValidator.equals(
      "item quantity in cartA should remain unchanged after failed delete",
      foundInAAfter.quantity,
      initialQuantityA,
    );

    TestValidator.equals(
      "item line_total in cartA should remain unchanged after failed delete",
      foundInAAfter.line_total,
      initialLineTotalA,
    );

    TestValidator.equals(
      "guest_cart_id of item in cartA should still point to cartA.id",
      foundInAAfter.guest_cart_id,
      cartA.id,
    );
  }

  // 10. Re-fetch items for cartB to ensure it has not been modified incorrectly.
  const pageBAfter: IPageIShoppingMallGuestCartItem.ISummary =
    await api.functional.shoppingMall.guestCarts.items.index(connection, {
      guestCartId: cartB.id,
    });
  typia.assert(pageBAfter);

  const mismatchedItemInB = pageBAfter.data.find(
    (item) => item.id === cartItemIdA,
  );

  TestValidator.predicate(
    "cartB must not contain the item belonging to cartA after mismatched delete",
    mismatchedItemInB === undefined,
  );
}
