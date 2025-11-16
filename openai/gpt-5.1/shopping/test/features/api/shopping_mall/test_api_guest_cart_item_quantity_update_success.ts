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
 * Validate that a guest can update the quantity of an existing guest cart item.
 *
 * ## Business context
 *
 * Guest carts represent unauthenticated visitor baskets stored in
 * shopping_mall_guest_carts with their line items in
 * shopping_mall_guest_cart_items. Even though the guest is anonymous, the
 * system still enforces catalog rules: only active, purchasable SKUs can be
 * added; quantity must be positive; and item identity (id, guest_cart_id,
 * product_sku_id) must remain stable when quantity changes.
 *
 * This test exercises the happy path for PUT
 * /shoppingMall/guestCarts/{guestCartId}/items/{guestCartItemId}:
 *
 * 1. Bootstrap actors and catalog:
 *
 *    - Register and log in a platform admin to be authorized to create brands.
 *    - Create a brand via POST /shoppingMall/platformAdmin/brands.
 *    - Register and log in a seller via /auth/seller/join and /auth/seller/login.
 *    - Create a product owned by the seller, associated with the created brand.
 *    - Create a SKU under that product that is active and purchasable.
 * 2. Guest cart lifecycle setup:
 *
 *    - Create a guest cart via POST /shoppingMall/guestCarts with a random
 *         guest_token and basic context metadata.
 *    - Add a cart item via POST /shoppingMall/guestCarts/{guestCartId}/items
 *         pointing to the created SKU with an initial quantity (e.g., 1).
 *    - Capture the guestCartId and guestCartItemId as well as created_at and initial
 *         quantity for later comparison.
 * 3. Quantity update operation:
 *
 *    - Call PUT /shoppingMall/guestCarts/{guestCartId}/items/{guestCartItemId} with
 *         an IShoppingMallGuestCartItem.IUpdate payload that sets quantity to a
 *         larger valid integer (e.g., 3).
 * 4. Assertions:
 *
 *    - Type-level: typia.assert on every non-void response.
 *    - Business-level:
 *
 *         - The updated item keeps the same id as the original cart item.
 *         - Guest_cart_id of the updated item equals the id of the original guest cart
 *                   and matches the original item.guest_cart_id.
 *         - Product_sku_id stays the same between original and updated items, confirming
 *                   we only changed quantity.
 *         - Quantity is updated to the new value and differs from the original quantity.
 *         - Updated_at is greater than or equal to created_at, and ideally changed after
 *                   the update. The test checks for updated_at >= created_at
 *                   and separately that updated_at differs from the original
 *                   updated_at, but tolerates equality if the backend treats
 *                   redundant updates as no-op.
 */
export async function test_api_guest_cart_item_quantity_update_success(
  connection: api.IConnection,
) {
  // 1. Register and log in a platform admin so we can create brands
  const platformAdminJoinBody = {
    email: `${RandomGenerator.alphabets(10)}@admin.test.com`,
    name: RandomGenerator.name(),
    password: "AdminPass!123",
    ip: "127.0.0.1",
    href: "https://admin.test/join",
    referrer: "https://admin.test/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;
  const platformAdminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  const platformAdminLoginBody = {
    email: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: "127.0.0.1",
    href: "https://admin.test/login",
    referrer: "https://admin.test/landing",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;
  const platformAdminLogin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLogin);

  // 2. Create a brand as platform admin
  const brandCreateBody = {
    name: `Brand ${RandomGenerator.alphabets(8)}`,
    slug: `brand-${RandomGenerator.alphabets(8)}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
    logo_uri: "https://cdn.test/brand/logo.png",
  } satisfies IShoppingMallBrand.ICreate;
  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 3. Register and log in a seller to create product and SKU
  const sellerJoinBody = {
    email: `${RandomGenerator.alphabets(10)}@seller.test.com`,
    password: "SellerPass!123",
    storeName: `Store ${RandomGenerator.name(1)}`,
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
    ip: "127.0.0.1",
    href: "https://seller.test/login",
    referrer: "https://seller.test/landing",
  } satisfies IShoppingMallSellerLogin.IRequest;
  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogin);

  // 4. Create a product owned by the seller and associated with the brand
  const productCode = `prod-${RandomGenerator.alphabets(12)}`;
  const productCreateBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: `Product ${RandomGenerator.paragraph({ sentences: 2 })}`,
    short_description: RandomGenerator.paragraph({ sentences: 4 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: "https://cdn.test/product/primary.png",
    additional_data: undefined,
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 5. Create an active, purchasable SKU under that product
  const skuCreateBody = {
    code: `sku-${RandomGenerator.alphabets(10)}`,
    name: `SKU ${RandomGenerator.alphabets(6)}`,
    listPrice: 10000,
    salePrice: 9000,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;
  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: productCode,
      body: skuCreateBody,
    });
  typia.assert(sku);

  // 6. Create a guest cart as an anonymous visitor
  const guestCartCreateBody = {
    guest_token: RandomGenerator.alphaNumeric(24),
    ip: "203.0.113.10",
    user_agent: "Mozilla/5.0 (E2E Test Guest Cart)",
    referrer: "https://shop.test/home",
    region_code: "KR",
  } satisfies IShoppingMallGuestCart.ICreate;
  const guestCart: IShoppingMallGuestCart =
    await api.functional.shoppingMall.guestCarts.create(connection, {
      body: guestCartCreateBody,
    });
  typia.assert(guestCart);

  // 7. Add a guest cart item for the created SKU with initial quantity = 1
  const initialQuantity: number = 1;
  const cartItemCreateBody = {
    sku_id: sku.id,
    quantity: initialQuantity,
  } satisfies IShoppingMallGuestCartItem.ICreate;
  const createdItem: IShoppingMallGuestCartItem =
    await api.functional.shoppingMall.guestCarts.items.create(connection, {
      guestCartId: guestCart.id,
      body: cartItemCreateBody,
    });
  typia.assert(createdItem);

  TestValidator.equals(
    "initial quantity must be stored correctly on creation",
    createdItem.quantity,
    initialQuantity,
  );
  TestValidator.equals(
    "created item must belong to created guest cart",
    createdItem.guest_cart_id,
    guestCart.id,
  );
  TestValidator.equals(
    "created item's SKU must match created SKU",
    createdItem.product_sku_id,
    sku.id,
  );

  const originalItemUpdatedAt: string = createdItem.updated_at;
  const originalItemCreatedAt: string = createdItem.created_at;

  TestValidator.predicate(
    "created_at must be a non-empty ISO date-time string",
    originalItemCreatedAt.length > 0,
  );

  // 8. Update the quantity of the guest cart item to a higher value
  const updatedQuantity: number = 3;
  const cartItemUpdateBody = {
    quantity: updatedQuantity,
  } satisfies IShoppingMallGuestCartItem.IUpdate;
  const updatedItem: IShoppingMallGuestCartItem =
    await api.functional.shoppingMall.guestCarts.items.update(connection, {
      guestCartId: guestCart.id,
      guestCartItemId: createdItem.id,
      body: cartItemUpdateBody,
    });
  typia.assert(updatedItem);

  // 9. Business assertions on update result
  TestValidator.equals(
    "updated item must keep the same id",
    updatedItem.id,
    createdItem.id,
  );
  TestValidator.equals(
    "updated item must still belong to same guest cart",
    updatedItem.guest_cart_id,
    guestCart.id,
  );
  TestValidator.equals(
    "updated item must still reference the same SKU",
    updatedItem.product_sku_id,
    createdItem.product_sku_id,
  );
  TestValidator.equals(
    "updated quantity must equal requested value",
    updatedItem.quantity,
    updatedQuantity,
  );
  TestValidator.notEquals(
    "updated quantity must differ from original quantity",
    updatedItem.quantity,
    createdItem.quantity,
  );

  // 10. Timestamps: updated_at should be >= created_at and preferably changed
  TestValidator.predicate(
    "updated_at must be a non-empty ISO date-time string",
    updatedItem.updated_at.length > 0,
  );

  // Compare lexicographically as ISO 8601 strings
  TestValidator.predicate(
    "updated_at should be greater than or equal to created_at",
    updatedItem.updated_at >= originalItemCreatedAt,
  );

  TestValidator.predicate(
    "updated_at should usually change after quantity update",
    updatedItem.updated_at === originalItemUpdatedAt
      ? true
      : updatedItem.updated_at > originalItemUpdatedAt,
  );
}
