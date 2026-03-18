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
import { generate_random_shopping_mall_member_carts_create } from "../../../generate/generate_random_shopping_mall_member_carts_create";
import { prepare_random_shopping_mall_cart } from "../../../prepare/prepare_random_shopping_mall_cart";

export async function test_api_cart_update_empty_cart_inventory_warning_recomputed(
  connection: api.IConnection,
): Promise<void> {
  // 1) Join as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized: IShoppingMallMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
      } satisfies IShoppingMallMember.IJoin,
    });
  typia.assert(authorized);
  // 2) Create a cart container (expected to be empty)
  const cartBefore: IShoppingMallCart =
    await api.functional.shoppingMall.member.carts.create(memberConnection, {
      body: {},
    });
  typia.assert(cartBefore);
  // Defensive: deleted_at must remain null for active cart
  TestValidator.equals("cart deleted_at is null", cartBefore.deleted_at, null);
  // 3) Update cart with non-authoritative client hint
  const updated: IShoppingMallCart =
    await api.functional.shoppingMall.member.carts.update(memberConnection, {
      cartId: cartBefore.id,
      body: {
        warning_inventory_insufficient: true,
      } satisfies IShoppingMallCart.IUpdate,
    });
  typia.assert(updated);
  // 4) Validate recomputation for empty cart
  TestValidator.equals(
    "warning_inventory_insufficient recomputed to false for empty cart",
    updated.warning_inventory_insufficient,
    false,
  );
  // 5) Validate timestamps
  TestValidator.notEquals(
    "updated_at changed",
    updated.updated_at,
    cartBefore.updated_at,
  );
  TestValidator.equals("deleted_at remains null", updated.deleted_at, null);
}
