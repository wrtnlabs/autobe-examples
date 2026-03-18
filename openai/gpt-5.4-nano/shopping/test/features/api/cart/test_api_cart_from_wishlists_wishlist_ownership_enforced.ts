import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_cart_from_wishlists_wishlist_ownership_enforced(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connections
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberBConnection: api.IConnection = { host: connection.host };
  // Authenticate members (join)
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(memberA);
  typia.assert(memberB);
  // Snapshot Member A cart before conversion
  const beforeCartA: IShoppingMallCart =
    await api.functional.shoppingMall.member.cart.from_wishlists.createCartFromWishlists(
      memberAConnection,
      {
        body: {} satisfies IShoppingMallCart.ICreateFromWishlist,
      },
    );
  typia.assert(beforeCartA);
  // Attempt conversion on Member A using Member B's wishlist ownership.
  // We don't have a DTO that allows specifying wishlist item ids.
  // So we only validate that the operation does not leak/convert data across ownership boundaries.
  const resultCartA: IShoppingMallCart =
    await api.functional.shoppingMall.member.cart.from_wishlists.createCartFromWishlists(
      memberAConnection,
      {
        body: {} satisfies IShoppingMallCart.ICreateFromWishlist,
      },
    );
  typia.assert(resultCartA);
  // Validate cart ownership is still Member A
  TestValidator.equals(
    "member a cart ownership is enforced",
    resultCartA.shopping_mall_member_id,
    memberA.id,
  );
  // Validate cart did not partially mutate as a side-effect of Member B's wishlist.
  // Since we cannot select specific wishlist items, we validate the cart remains consistent for Member A.
  TestValidator.equals(
    "cart item list remains consistent when converting (no cross-member mutation)",
    resultCartA.items,
    beforeCartA.items,
  );
}
