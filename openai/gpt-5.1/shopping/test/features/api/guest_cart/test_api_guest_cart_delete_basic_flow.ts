import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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
 * Validate deletion of a populated guest cart and its items.
 *
 * Business context: A guest (unauthenticated visitor) can build a cart, adding
 * SKUs that are created and owned by sellers under brands managed by platform
 * admins. When the guest cart is deleted, both the cart record and its line
 * items must be removed so that the cartId can no longer be used to manipulate
 * guest cart state.
 *
 * Steps:
 *
 * 1. Register and auto-login a platformAdmin.
 * 2. Create a brand as platformAdmin.
 * 3. Register and auto-login a seller.
 * 4. Create a product for that seller under the created brand.
 * 5. Create a SKU for the product.
 * 6. Create a guest cart as an anonymous visitor.
 * 7. Add a guest cart item referencing the created SKU.
 * 8. Delete the guest cart via DELETE /shoppingMall/guestCarts/{guestCartId}.
 * 9. Attempt to add another item to the same guestCartId and assert that an error
 *    is thrown, proving that the cart has been removed.
 */
export async function test_api_guest_cart_delete_basic_flow(
  connection: api.IConnection,
) {
  // 1. Register platformAdmin (join implies an authenticated session)
  const platformAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: "password-1234",
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2. Create a brand as platformAdmin
  const brandCreateBody = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    logo_uri: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 3. Register a seller (join implies authenticated seller session)
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "password-1234",
    storeName: RandomGenerator.name(1),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(seller);

  // Explicitly login again as seller to exercise the login dependency
  const sellerLoginBody = {
    email: sellerJoinBody.email,
    password: sellerJoinBody.password,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerSession: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerSession);

  // 4. Create a product under this seller and brand
  const productCode = RandomGenerator.alphaNumeric(16) as string &
    tags.MinLength<1>;

  const productCreateBody = {
    shopping_mall_seller_id: sellerSession.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
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

  // 5. Create a SKU for the product
  const skuCreateBody = {
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.paragraph({ sentences: 1 }),
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

  // 6. Create a guest cart as anonymous visitor
  const guestCartCreateBody = {
    guest_token: RandomGenerator.alphaNumeric(24),
    ip: undefined,
    user_agent: RandomGenerator.name(3),
    referrer: typia.random<string & tags.Format<"uri">>(),
    region_code: "KR",
  } satisfies IShoppingMallGuestCart.ICreate;

  const guestCart: IShoppingMallGuestCart =
    await api.functional.shoppingMall.guestCarts.create(connection, {
      body: guestCartCreateBody,
    });
  typia.assert(guestCart);

  // 7. Add a guest cart item referencing the created SKU
  const guestCartItemCreateBody = {
    sku_id: sku.id,
    quantity: 1,
  } satisfies IShoppingMallGuestCartItem.ICreate;

  const guestCartItem: IShoppingMallGuestCartItem =
    await api.functional.shoppingMall.guestCarts.items.create(connection, {
      guestCartId: guestCart.id,
      body: guestCartItemCreateBody,
    });
  typia.assert(guestCartItem);

  // Sanity check relationships
  TestValidator.equals(
    "guest cart item belongs to created cart",
    guestCartItem.guest_cart_id,
    guestCart.id,
  );

  // 8. Delete the guest cart
  await api.functional.shoppingMall.guestCarts.erase(connection, {
    guestCartId: guestCart.id,
  });

  // 9. Verify that further operations using this guestCartId fail
  await TestValidator.error(
    "cannot add items to deleted guest cart",
    async () => {
      await api.functional.shoppingMall.guestCarts.items.create(connection, {
        guestCartId: guestCart.id,
        body: {
          sku_id: sku.id,
          quantity: 1,
        } satisfies IShoppingMallGuestCartItem.ICreate,
      });
    },
  );
}
