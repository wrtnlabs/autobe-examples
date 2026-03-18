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

export async function test_api_cart_update_inventory_warning_recomputed(
  connection: api.IConnection,
): Promise<void> {
  // 1) Join as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberCredentials = {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "test-password-1234",
    } satisfies IShoppingMallMember.IJoin,
  };
  const authorized = await authorize_member_join(
    memberConnection,
    memberCredentials,
  );
  typia.assert(authorized);
  // Actor-specific connection (memberConnection already has auth header)
  const userConnection: api.IConnection = { host: connection.host };
  userConnection.headers = memberConnection.headers;
  // 2) Create cart for this member
  const cart1 = await generate_random_shopping_mall_member_carts_create(
    userConnection,
    { body: {} },
  );
  typia.assert(cart1);
  const initialCartId = cart1.id;
  const initialCreatedAt = cart1.created_at;
  const initialDeletedAt = cart1.deleted_at;
  const initialWarning = cart1.warning_inventory_insufficient;
  const initialUpdatedAt = cart1.updated_at;
  // 3) Determine recomputed warning based on cart items.
  // NOTE: IShoppingMallCart.items is typed as null in DTO definition, so we can't compute from items.
  // Instead, we enforce recomputation by flipping the request flag and asserting server response equals recomputed state.
  const payloadWarning = !initialWarning;
  // 4) Update cart with flipped warning flag
  const updated = await api.functional.shoppingMall.member.carts.update(
    userConnection,
    {
      cartId: initialCartId,
      body: {
        warning_inventory_insufficient: payloadWarning,
      } satisfies IShoppingMallCart.IUpdate,
    },
  );
  typia.assert(updated);
  // 5) Validate server recomputed warning strictly from cart's own items.
  // Since we can't access items via DTO, at minimum we ensure recomputation occurred
  // by comparing to the previous state when payload differs.
  // If initial warning is already correct, server must return the same boolean.
  // Otherwise, it must return the opposite.
  TestValidator.equals("cartId unchanged", updated.id, initialCartId);
  TestValidator.equals(
    "member ownership unchanged",
    updated.shopping_mall_member_id,
    cart1.shopping_mall_member_id,
  );
  TestValidator.equals(
    "created_at unchanged",
    updated.created_at,
    initialCreatedAt,
  );
  TestValidator.equals(
    "deleted_at unchanged",
    updated.deleted_at,
    initialDeletedAt,
  );
  TestValidator.notEquals(
    "updated_at changed",
    updated.updated_at,
    initialUpdatedAt,
  );
  // returned warning must be independent of payload
  TestValidator.equals(
    "warning inventory recomputed",
    updated.warning_inventory_insufficient,
    cart1.warning_inventory_insufficient,
  );
  typia.assert(updated);
}
