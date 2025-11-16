import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallGuestCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestCart";
import type { IShoppingMallGuestCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestCartItem";

/**
 * Validate happy-path retrieval of a guest cart with items by its identifier.
 *
 * Business goal: ensure that an anonymous shopper can restore their guest cart
 * state purely by the cart ID and that the GET
 * /shoppingMall/guestCarts/{guestCartId} read model accurately composes the
 * guest cart header plus its aggregated line items.
 *
 * Steps:
 *
 * 1. Create a guest cart with realistic anonymous-session metadata (guest_token,
 *    optional ip/user_agent/referrer/region_code) using the public POST
 *    /shoppingMall/guestCarts endpoint.
 * 2. Insert one or more guest cart items into this cart via POST
 *    /shoppingMall/guestCarts/{guestCartId}/items, capturing the resulting
 *    IShoppingMallGuestCartItem instances.
 * 3. Retrieve the guest cart publicly with GET
 *    /shoppingMall/guestCarts/{guestCartId} with the same connection (no
 *    explicit authentication).
 * 4. Validate that the retrieved IShoppingMallGuestCart:
 *
 *    - Has the same id as the one returned on creation.
 *    - Preserves the guest_token and optional metadata fields used at creation time
 *         when present.
 *    - Exposes created_at and updated_at timestamps in a logical order (created_at
 *         <= updated_at).
 *    - Contains an items collection whose entries correspond to the guest cart items
 *         that were created, at least in terms of product_sku_id and quantity.
 */
export async function test_api_guest_cart_retrieval_happy_path(
  connection: api.IConnection,
) {
  // 1. Create a guest cart with realistic anonymous-session metadata
  const guestToken: string = RandomGenerator.alphaNumeric(32);
  const regionCode: string = "KR";

  const createBody = {
    guest_token: guestToken,
    // optional metadata
    ip: "203.0.113.10",
    user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    referrer: "https://example.com/landing", // must be a URI per tags.Format<"uri">
    region_code: regionCode,
  } satisfies IShoppingMallGuestCart.ICreate;

  const createdCart: IShoppingMallGuestCart =
    await api.functional.shoppingMall.guestCarts.create(connection, {
      body: createBody,
    });
  typia.assert(createdCart);

  // 2. Insert one or more guest cart items into this cart
  const firstItemBody = {
    sku_id: RandomGenerator.alphaNumeric(16),
    quantity: 1,
  } satisfies IShoppingMallGuestCartItem.ICreate;

  const firstItem: IShoppingMallGuestCartItem =
    await api.functional.shoppingMall.guestCarts.items.create(connection, {
      guestCartId: createdCart.id,
      body: firstItemBody,
    });
  typia.assert(firstItem);

  const secondItemBody = {
    sku_id: RandomGenerator.alphaNumeric(16),
    quantity: 2,
  } satisfies IShoppingMallGuestCartItem.ICreate;

  const secondItem: IShoppingMallGuestCartItem =
    await api.functional.shoppingMall.guestCarts.items.create(connection, {
      guestCartId: createdCart.id,
      body: secondItemBody,
    });
  typia.assert(secondItem);

  const createdItems: IShoppingMallGuestCartItem[] = [firstItem, secondItem];

  // 3. Retrieve the guest cart publicly using its identifier
  const reloadedCart: IShoppingMallGuestCart =
    await api.functional.shoppingMall.guestCarts.at(connection, {
      guestCartId: createdCart.id,
    });
  typia.assert(reloadedCart);

  // 4. Validate core cart identity and metadata
  TestValidator.equals(
    "guest cart id should remain stable between create and read",
    reloadedCart.id,
    createdCart.id,
  );

  TestValidator.equals(
    "guest_token should match the value used at creation",
    reloadedCart.guest_token,
    createBody.guest_token,
  );

  TestValidator.equals(
    "ip should match creation metadata when provided",
    reloadedCart.ip,
    createBody.ip,
  );

  TestValidator.equals(
    "user_agent should match creation metadata when provided",
    reloadedCart.user_agent,
    createBody.user_agent,
  );

  TestValidator.equals(
    "referrer should match creation metadata when provided",
    reloadedCart.referrer,
    createBody.referrer,
  );

  // Timestamps logical ordering: created_at <= updated_at
  TestValidator.predicate(
    "created_at must not be after updated_at",
    new Date(reloadedCart.created_at).getTime() <=
      new Date(reloadedCart.updated_at).getTime(),
  );

  // 5. Validate that items collection includes the created items
  TestValidator.predicate(
    "reloaded cart should contain at least as many items as created",
    reloadedCart.items.length >= createdItems.length,
  );

  // Build a lookup map from item.id to item for easier comparison
  const reloadedById = new Map<string, IShoppingMallGuestCartItem>(
    reloadedCart.items.map((item) => [item.id, item]),
  );

  for (const created of createdItems) {
    const found = reloadedById.get(created.id);

    TestValidator.predicate(
      `reloaded cart must contain created item ${created.id}`,
      !!found,
    );

    if (found) {
      TestValidator.equals(
        `quantity should match for item ${created.id}`,
        found.quantity,
        created.quantity,
      );

      TestValidator.equals(
        `product_sku_id should match for item ${created.id}`,
        found.product_sku_id,
        created.product_sku_id,
      );

      TestValidator.equals(
        `guest_cart_id should point to the owning cart for item ${created.id}`,
        found.guest_cart_id,
        createdCart.id,
      );
    }
  }
}
