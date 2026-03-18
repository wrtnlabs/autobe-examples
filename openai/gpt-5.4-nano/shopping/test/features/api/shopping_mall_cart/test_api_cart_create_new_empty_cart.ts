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

export async function test_api_cart_create_new_empty_cart(
  connection: api.IConnection,
): Promise<void> {
  // 1) Register a new member and get authorization context
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  // 2) Create a new empty cart (use the same authenticated memberConnection)
  const cart = await api.functional.shoppingMall.member.carts.create(
    memberConnection,
    {
      body: {},
    },
  );
  typia.assert(cart);
  // 3) Validate response semantics (business/ownership + empty-cart state)
  TestValidator.equals("cart is active", cart.deleted_at, null);
  TestValidator.equals(
    "cart is owned by authenticated member",
    cart.shopping_mall_member_id,
    memberAuth.id,
  );
  TestValidator.equals(
    "warning_inventory_insufficient is false for empty cart",
    cart.warning_inventory_insufficient,
    false,
  );
  // DTO definition constrains items to null; newly created empty cart is expected
  TestValidator.equals("items is null/empty for a new cart", cart.items, null);
}
