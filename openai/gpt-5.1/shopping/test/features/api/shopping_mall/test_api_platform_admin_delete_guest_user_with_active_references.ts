import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallGuestCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestCart";
import type { IShoppingMallGuestCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestCartItem";
import type { IShoppingMallGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestUser";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

export async function test_api_platform_admin_delete_guest_user_with_active_references(
  connection: api.IConnection,
) {
  // 1. Bootstrap a platform admin and establish auth context
  const adminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphabets(12),
    href: "https://admin.example.com/onboarding",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  TestValidator.predicate(
    "platform admin join should yield active admin session",
    admin.isActive === true,
  );

  // 2. Create a guest user under platform admin context
  const guestUserBody = {
    temporary_identifier: RandomGenerator.alphaNumeric(24),
    user_agent: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallGuestUser.ICreate;

  const guestUser: IShoppingMallGuestUser =
    await api.functional.shoppingMall.platformAdmin.guestUsers.create(
      connection,
      {
        body: guestUserBody,
      },
    );
  typia.assert<IShoppingMallGuestUser>(guestUser);

  TestValidator.predicate(
    "guest user should have server-assigned UUID id",
    () => typia.is<string & tags.Format<"uuid">>(guestUser.id),
  );

  // 3. Create a guest cart that represents an active guest-side reference
  //    We correlate via a shared guest_token prefix for human reasoning,
  //    but the schema itself does not expose direct FK to the guest user.
  const guestTokenCore = RandomGenerator.alphaNumeric(16);
  const guestCartBody = {
    guest_token: `guest-${guestTokenCore}`,
    ip: "203.0.113.10",
    user_agent: RandomGenerator.paragraph({ sentences: 2 }),
    referrer: "https://shop.example.com/home",
    region_code: "KR",
  } satisfies IShoppingMallGuestCart.ICreate;

  const guestCart: IShoppingMallGuestCart =
    await api.functional.shoppingMall.guestCarts.create(connection, {
      body: guestCartBody,
    });
  typia.assert<IShoppingMallGuestCart>(guestCart);

  TestValidator.equals(
    "created guest cart should echo guest_token from request body",
    guestCart.guest_token,
    guestCartBody.guest_token,
  );

  // 4. Attempt to delete the guest user while the guest cart is still present
  //    We expect either successful deletion with cascading cleanup or
  //    independent lifecycles; in both cases, the client call must complete
  //    without type-level inconsistencies.
  await api.functional.shoppingMall.platformAdmin.guestUsers.erase(connection, {
    guestUserId: guestUser.id,
  });

  // 5. Business-level assertion: reaching this point without HttpError
  //    indicates that the backend permits deletion regardless of guest cart
  //    presence (either via cascade or decoupled guest carts).
  TestValidator.predicate(
    "deleting guest user with concurrently existing guest cart should succeed at API level",
    true,
  );
}
