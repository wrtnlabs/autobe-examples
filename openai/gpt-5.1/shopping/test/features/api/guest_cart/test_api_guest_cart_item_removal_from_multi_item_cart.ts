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
 * Verify that deleting one item from a multi-item guest cart removes only that
 * specific line item while keeping the remaining items intact.
 *
 * Business flow:
 *
 * 1. Platform admin joins and logs in.
 * 2. Platform admin creates a brand.
 * 3. Seller joins and logs in.
 * 4. Seller creates a multi-SKU product associated with the brand.
 * 5. Seller creates two distinct SKUs under the product.
 * 6. A guest cart is created without authentication.
 * 7. Two guest cart items are added to the same cart, each referencing a different
 *    SKU.
 * 8. One of the two items is deleted using DELETE
 *    /shoppingMall/guestCarts/{guestCartId}/items/{guestCartItemId}.
 * 9. The remaining items are listed using PATCH
 *    /shoppingMall/guestCarts/{guestCartId}/items.
 * 10. Validate that only the targeted item was removed and the other remains
 *     unchanged.
 */
export async function test_api_guest_cart_item_removal_from_multi_item_cart(
  connection: api.IConnection,
): Promise<void> {
  // 1. Platform admin join
  const platformAdminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const platformAdminJoinBody = {
    email: platformAdminEmail,
    name: RandomGenerator.name(2),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Platform admin login (explicitly exercise login flow)
  const platformAdminLoginBody = {
    email: platformAdminEmail,
    password: platformAdminJoinBody.password,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const platformAdminLogin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLogin);

  // 3. Create a brand as platform admin
  const brandCreateBody = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    logo_uri: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 4. Seller join
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const sellerJoinBody = {
    email: sellerEmail,
    password: RandomGenerator.alphaNumeric(12),
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // 5. Seller login (switch connection context to seller explicitly)
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerJoinBody.password,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogin);

  // 6. Seller creates a multi-SKU product associated with the brand
  const productCode: string & tags.MinLength<1> =
    RandomGenerator.alphaNumeric(10);

  const productCreateBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: RandomGenerator.name(3),
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: typia.random<string & tags.Format<"uri">>(),
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 7. Seller creates two distinct SKUs under the product
  const sku1Code = `${productCode}-SKU1`;
  const sku2Code = `${productCode}-SKU2`;

  const sku1Body = {
    code: sku1Code,
    name: `${product.name} Variant 1`,
    listPrice: 100,
    salePrice: 90,
    currency: "USD",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sku2Body = {
    code: sku2Code,
    name: `${product.name} Variant 2`,
    listPrice: 200,
    salePrice: 180,
    currency: "USD",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sku1: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: product.code,
      body: sku1Body,
    });
  typia.assert(sku1);

  const sku2: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: product.code,
      body: sku2Body,
    });
  typia.assert(sku2);

  // 8. Create an unauthenticated guest cart (use a derived connection with empty headers)
  const guestConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  const guestCartCreateBody = {
    guest_token: RandomGenerator.alphaNumeric(16),
    ip: "127.0.0.1",
    user_agent: "E2E-Test-Agent",
    referrer: typia.random<string & tags.Format<"uri">>(),
    region_code: "US",
  } satisfies IShoppingMallGuestCart.ICreate;

  const guestCart: IShoppingMallGuestCart =
    await api.functional.shoppingMall.guestCarts.create(guestConnection, {
      body: guestCartCreateBody,
    });
  typia.assert(guestCart);

  // 9. Add two guest cart items, each referencing a different SKU
  const item1CreateBody = {
    sku_id: sku1.id,
    quantity: 1,
  } satisfies IShoppingMallGuestCartItem.ICreate;

  const item1: IShoppingMallGuestCartItem =
    await api.functional.shoppingMall.guestCarts.items.create(guestConnection, {
      guestCartId: guestCart.id,
      body: item1CreateBody,
    });
  typia.assert(item1);

  const item2CreateBody = {
    sku_id: sku2.id,
    quantity: 1,
  } satisfies IShoppingMallGuestCartItem.ICreate;

  const item2: IShoppingMallGuestCartItem =
    await api.functional.shoppingMall.guestCarts.items.create(guestConnection, {
      guestCartId: guestCart.id,
      body: item2CreateBody,
    });
  typia.assert(item2);

  // Sanity-check that item IDs are distinct
  TestValidator.notEquals(
    "guest cart items must have different ids",
    item1.id,
    item2.id,
  );

  // 10. List items before deletion and ensure there are at least 2 records
  const beforePage: IPageIShoppingMallGuestCartItem.ISummary =
    await api.functional.shoppingMall.guestCarts.items.index(guestConnection, {
      guestCartId: guestCart.id,
    });
  typia.assert(beforePage);

  TestValidator.predicate(
    "before deletion, guest cart should have at least 2 items",
    beforePage.pagination.records >= 2 && beforePage.data.length >= 2,
  );

  // 11. Delete only the first item
  await api.functional.shoppingMall.guestCarts.items.erase(guestConnection, {
    guestCartId: guestCart.id,
    guestCartItemId: item1.id,
  });

  // 12. List items after deletion
  const afterPage: IPageIShoppingMallGuestCartItem.ISummary =
    await api.functional.shoppingMall.guestCarts.items.index(guestConnection, {
      guestCartId: guestCart.id,
    });
  typia.assert(afterPage);

  // There should be exactly one remaining item
  TestValidator.equals(
    "after deletion, pagination.records should be 1",
    afterPage.pagination.records,
    1,
  );
  TestValidator.equals(
    "after deletion, data.length should be 1",
    afterPage.data.length,
    1,
  );

  const remainingItem = afterPage.data[0];

  // 13. Ensure the deleted item is not present and the other item remains
  TestValidator.notEquals(
    "remaining item id must not equal deleted item id",
    remainingItem.id,
    item1.id,
  );

  TestValidator.equals(
    "remaining item id must equal undeleted item id",
    remainingItem.id,
    item2.id,
  );

  // Validate SKU and quantity on the remaining item
  TestValidator.equals(
    "remaining item sku summary id matches sku2.id",
    remainingItem.sku.id,
    sku2.id,
  );
  TestValidator.equals(
    "remaining item quantity is 1",
    remainingItem.quantity,
    1,
  );
}
