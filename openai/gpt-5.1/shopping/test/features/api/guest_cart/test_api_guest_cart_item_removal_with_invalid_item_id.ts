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
 * Validate that deleting a guest cart item with an invalid item id fails and
 * does not mutate the cart.
 *
 * Business context:
 *
 * - Guest carts are owned by unauthenticated visitors and identified by a UUID
 *   guestCartId.
 * - Line items inside a guest cart are represented by IShoppingMallGuestCartItem
 *   and addressed by their own UUID guestCartItemId.
 * - The erase endpoint must enforce the invariant that the (guestCartId,
 *   guestCartItemId) pair must match an existing row in
 *   shopping_mall_guest_cart_items; otherwise it should fail with an error
 *   instead of silently succeeding.
 *
 * Test flow:
 *
 * 1. Bootstrap actors and catalog:
 *
 *    - Join and login as a platform admin.
 *    - Create a Brand using POST /shoppingMall/platformAdmin/brands with
 *         IShoppingMallBrand.ICreate.
 *    - Join and login as a seller.
 *    - Create a Product using POST /shoppingMall/seller/products with
 *         IShoppingMallProduct.ICreate, associating it to the created seller
 *         and brand.
 *    - Create a Product SKU for that product using POST
 *         /shoppingMall/seller/products/{productCode}/skus with
 *         IShoppingMallProductSku.ICreate.
 * 2. Guest cart and item setup:
 *
 *    - Create a guest cart via POST /shoppingMall/guestCarts with
 *         IShoppingMallGuestCart.ICreate.
 *    - Add a valid line item into that cart using POST
 *         /shoppingMall/guestCarts/{guestCartId}/items with
 *         IShoppingMallGuestCartItem.ICreate, referencing the created SKU.
 *    - Capture the returned IShoppingMallGuestCartItem.id as validItemId.
 * 3. Invalid deletion attempt:
 *
 *    - Generate a fresh random UUID string & tags.Format<"uuid"> via typia.random
 *         and ensure it differs from validItemId.
 *    - Call api.functional.shoppingMall.guestCarts.items.erase(connection, {
 *         guestCartId, guestCartItemId: invalidId }).
 *    - Wrap the call in TestValidator.error("invalid guest cart item id should raise
 *         error", async () => { ... }) to assert that an HttpError is thrown
 *         for the invalid pair.
 *    - The test must not assert the numeric HTTP status code or inspect error body
 *         details.
 * 4. Post-condition verification:
 *
 *    - Call api.functional.shoppingMall.guestCarts.items.index(connection, {
 *         guestCartId }).
 *    - Typia.assert the IPageIShoppingMallGuestCartItem.ISummary response.
 *    - Validate, using TestValidator, that:
 *
 *         - The pagination.records is at least 1.
 *         - There exists exactly one item whose id === validItemId.
 *         - That item still has the same quantity and sku_id/product_id as originally
 *                   returned from the create call.
 *
 * Implementation constraints:
 *
 * - Use only SDK calls defined in the materials; do not invent new endpoints.
 * - Do not manipulate connection.headers manually; rely on auth SDK functions for
 *   token handling.
 * - For request bodies use inline object literals with `satisfies` concrete DTO
 *   types (IShoppingMallPlatformAdminJoin.IRequest,
 *   IShoppingMallPlatformAdminLogin.IRequest, IShoppingMallSellerJoin.IRequest,
 *   IShoppingMallSellerLogin.IRequest, IShoppingMallBrand.ICreate,
 *   IShoppingMallProduct.ICreate, IShoppingMallProductSku.ICreate,
 *   IShoppingMallGuestCart.ICreate, IShoppingMallGuestCartItem.ICreate).
 * - Use RandomGenerator and typia.random with appropriate tags for generating
 *   realistic values (email, uri, uuid, int32, etc.).
 */
export async function test_api_guest_cart_item_removal_with_invalid_item_id(
  connection: api.IConnection,
) {
  // 1. Platform admin join and login
  const platformAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  const platformAdminLoginBody = {
    email: platformAdmin.email,
    password: platformAdminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const platformAdminLoggedIn: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoggedIn);

  // 2. Create brand as platform admin
  const brandCreateBody = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    logo_uri: ("https://cdn.example.com/logo/" +
      RandomGenerator.alphaNumeric(8)) as string & tags.Format<"uri">,
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 3. Seller join and login
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
  typia.assert(sellerAuthorized);

  const sellerLoginBody = {
    email: sellerJoinBody.email,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://seller.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerLoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoggedIn);

  // 4. Create product as seller
  const productCode = RandomGenerator.alphaNumeric(10);
  const productCreateBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    short_description: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: ("https://cdn.example.com/product/" +
      RandomGenerator.alphaNumeric(8)) as string & tags.Format<"uri">,
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 5. Create SKU under the product
  const skuCode = RandomGenerator.alphaNumeric(10);
  const skuCreateBody = {
    code: skuCode,
    name: RandomGenerator.paragraph({ sentences: 3 }),
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

  // 6. Guest cart creation
  const guestCartCreateBody = {
    guest_token: RandomGenerator.alphaNumeric(32),
    ip: "203.0.113.1",
    user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    referrer: "https://shop.example.com/landing" as string & tags.Format<"uri">,
    region_code: "KR",
  } satisfies IShoppingMallGuestCart.ICreate;

  const guestCart: IShoppingMallGuestCart =
    await api.functional.shoppingMall.guestCarts.create(connection, {
      body: guestCartCreateBody,
    });
  typia.assert(guestCart);

  // 7. Add a valid item to the guest cart
  const cartItemCreateBody = {
    sku_id: sku.id,
    quantity: 2,
  } satisfies IShoppingMallGuestCartItem.ICreate;

  const validItem: IShoppingMallGuestCartItem =
    await api.functional.shoppingMall.guestCarts.items.create(connection, {
      guestCartId: guestCart.id,
      body: cartItemCreateBody,
    });
  typia.assert(validItem);

  // 8. Attempt to delete with an invalid item id
  const invalidItemId = typia.random<string & tags.Format<"uuid">>();

  // Ensure invalidItemId is different from validItem.id; regenerate if equal
  const finalInvalidItemId =
    invalidItemId === validItem.id
      ? typia.random<string & tags.Format<"uuid">>()
      : invalidItemId;

  await TestValidator.error(
    "invalid guest cart item id should raise error",
    async () => {
      await api.functional.shoppingMall.guestCarts.items.erase(connection, {
        guestCartId: guestCart.id,
        guestCartItemId: finalInvalidItemId,
      });
    },
  );

  // 9. Re-list items in the guest cart and ensure the valid item is unchanged
  const itemsPage: IPageIShoppingMallGuestCartItem.ISummary =
    await api.functional.shoppingMall.guestCarts.items.index(connection, {
      guestCartId: guestCart.id,
    });
  typia.assert(itemsPage);

  TestValidator.predicate(
    "pagination should report at least one record",
    itemsPage.pagination.records >= 1,
  );

  const remainingItems = itemsPage.data.filter(
    (item) => item.id === validItem.id,
  );

  TestValidator.equals(
    "exactly one item with the original id should remain",
    remainingItems.length,
    1,
  );

  const remaining = remainingItems[0];

  TestValidator.equals(
    "remaining item quantity must match original",
    remaining.quantity,
    validItem.quantity,
  );

  TestValidator.equals(
    "remaining item product id must match original",
    remaining.product_id,
    validItem.product_id,
  );

  TestValidator.equals(
    "remaining item sku id must match original",
    remaining.sku_id,
    validItem.product_sku_id,
  );
}
