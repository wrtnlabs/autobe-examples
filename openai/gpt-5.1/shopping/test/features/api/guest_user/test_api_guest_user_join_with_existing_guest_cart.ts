import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallGuestCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestCart";
import type { IShoppingMallGuestCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestCartItem";
import type { IShoppingMallGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestUser";
import type { IShoppingMallGuestUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestUserJoin";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Validate that joining a guest user with an existing anonymous guest cart
 * properly links the cart while preserving its contents.
 *
 * Business flow:
 *
 * 1. Create an anonymous guest cart with a random guest_token.
 * 2. Add at least one line item into that cart.
 * 3. Reload the cart and snapshot its items for later comparison.
 * 4. Call /auth/guestUser/join with guestCartToken equal to the cart's
 *    guest_token.
 * 5. Verify the guest join response and remember the created guest user id.
 * 6. Join as a platform admin to gain admin-level read access.
 * 7. As platform admin, fetch the guest user by id and confirm identity
 *    consistency.
 * 8. Fetch the guest cart again and check that its items are unchanged and still
 *    associated with the same guest_token, proving anonymous cart upgrade
 *    preserves contents.
 */
export async function test_api_guest_user_join_with_existing_guest_cart(
  connection: api.IConnection,
) {
  // 1. Create an anonymous guest cart.
  const guestToken: string = RandomGenerator.alphaNumeric(32);
  const hrefUrl: string = "https://shop.example.com/cart";
  const referrerUrl: string = "https://shop.example.com/landing";

  const createdCart: IShoppingMallGuestCart =
    await api.functional.shoppingMall.guestCarts.create(connection, {
      body: {
        guest_token: guestToken,
        ip: "203.0.113.10",
        user_agent: "Mozilla/5.0 (E2E Test Guest Cart)",
        referrer: hrefUrl as string & tags.Format<"uri">,
        region_code: "KR",
      } satisfies IShoppingMallGuestCart.ICreate,
    });
  typia.assert<IShoppingMallGuestCart>(createdCart);

  TestValidator.equals(
    "guest cart token in response matches the one we sent",
    createdCart.guest_token,
    guestToken,
  );

  // 2. Add at least one item into that cart.
  const skuId: string = RandomGenerator.alphaNumeric(16);
  const quantity: number & tags.Type<"int32"> & tags.Minimum<1> = 1 as number &
    tags.Type<"int32"> &
    tags.Minimum<1>;

  const createdItem: IShoppingMallGuestCartItem =
    await api.functional.shoppingMall.guestCarts.items.create(connection, {
      guestCartId: createdCart.id,
      body: {
        sku_id: skuId,
        quantity,
      } satisfies IShoppingMallGuestCartItem.ICreate,
    });
  typia.assert<IShoppingMallGuestCartItem>(createdItem);

  TestValidator.equals(
    "created item should belong to the created guest cart",
    createdItem.guest_cart_id,
    createdCart.id,
  );

  // 3. Reload the cart and snapshot its items.
  const cartBeforeJoin: IShoppingMallGuestCart =
    await api.functional.shoppingMall.guestCarts.at(connection, {
      guestCartId: createdCart.id,
    });
  typia.assert<IShoppingMallGuestCart>(cartBeforeJoin);

  TestValidator.predicate(
    "guest cart should have at least one item before guest join",
    cartBeforeJoin.items.length > 0,
  );

  const itemsSnapshotBefore: IShoppingMallGuestCartItem[] =
    cartBeforeJoin.items.map((item) => ({ ...item }));

  // 4. Call /auth/guestUser/join with guestCartToken.
  const temporaryIdentifier: string = RandomGenerator.alphaNumeric(24);

  const guestAuthorized: IShoppingMallGuestUser.IAuthorized =
    await api.functional.auth.guestUser.join(connection, {
      body: {
        temporaryIdentifier,
        guestCartToken: createdCart.guest_token,
        ip: "203.0.113.10",
        userAgent: "Mozilla/5.0 (E2E Test Guest Join)",
        href: hrefUrl as string & tags.Format<"uri">,
        referrer: referrerUrl as string & tags.Format<"uri">,
      } satisfies IShoppingMallGuestUserJoin.IRequest,
    });
  typia.assert<IShoppingMallGuestUser.IAuthorized>(guestAuthorized);

  const guestUserId: string & tags.Format<"uuid"> = guestAuthorized.id;

  TestValidator.equals(
    "authorized guest temporary_identifier should not be empty",
    guestAuthorized.temporary_identifier.length > 0,
    true,
  );

  // 5. Join as platform admin for admin-level inspection.
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const adminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: {
        email: adminEmail,
        name: RandomGenerator.name(),
        password: RandomGenerator.alphaNumeric(12),
        ip: "198.51.100.5",
        href: "https://admin.example.com/join" as string & tags.Format<"uri">,
        referrer: "https://admin.example.com/landing" as string &
          tags.Format<"uri">,
      } satisfies IShoppingMallPlatformAdminJoin.IRequest,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(adminAuthorized);

  TestValidator.predicate(
    "platform admin account should be active",
    adminAuthorized.isActive === true,
  );

  // 6. As platform admin, fetch the guest user by id.
  const guestFromAdmin: IShoppingMallGuestUser =
    await api.functional.shoppingMall.platformAdmin.guestUsers.at(connection, {
      guestUserId: guestUserId,
    });
  typia.assert<IShoppingMallGuestUser>(guestFromAdmin);

  TestValidator.equals(
    "guest user id from admin view matches authorized guest id",
    guestFromAdmin.id,
    guestUserId,
  );

  // 7. Fetch the guest cart again and ensure items are unchanged.
  const cartAfterJoin: IShoppingMallGuestCart =
    await api.functional.shoppingMall.guestCarts.at(connection, {
      guestCartId: createdCart.id,
    });
  typia.assert<IShoppingMallGuestCart>(cartAfterJoin);

  TestValidator.equals(
    "guest cart token after join still matches original token",
    cartAfterJoin.guest_token,
    createdCart.guest_token,
  );

  TestValidator.equals(
    "guest cart items should remain unchanged after guest user join",
    cartAfterJoin.items,
    itemsSnapshotBefore,
  );
}
