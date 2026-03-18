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

export async function test_api_cart_retrieve_empty_or_deleted_cart(
  connection: api.IConnection,
): Promise<void> {
  // Subcase A: active cart with empty items
  const memberAConnection: api.IConnection = { host: connection.host };
  const authorizedA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallMember.IJoin,
  });
  const memberAAuthedConnection: api.IConnection = { host: connection.host };
  memberAAuthedConnection.headers = {
    Authorization: authorizedA.token.access,
  };
  const cartA = await generate_random_shopping_mall_member_carts_create(
    memberAAuthedConnection,
    {
      body: {},
    },
  );
  typia.assert(cartA);
  const retrievedCartA = await api.functional.shoppingMall.member.carts.at(
    memberAAuthedConnection,
    {
      cartId: cartA.id,
    },
  );
  typia.assert(retrievedCartA);
  TestValidator.equals("cart is active", retrievedCartA.deleted_at, null);
  // DTO for IShoppingMallCart defines items as null; keep compilation-safe expectation.
  TestValidator.equals(
    "items is null for empty cart",
    retrievedCartA.items,
    null,
  );
  TestValidator.predicate(
    "warning_inventory_insufficient is boolean",
    typeof retrievedCartA.warning_inventory_insufficient === "boolean",
  );
  // Subcase B: soft-deleted cart becomes unavailable
  const memberBConnection: api.IConnection = { host: connection.host };
  const authorizedB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallMember.IJoin,
  });
  const memberBAuthedConnection: api.IConnection = { host: connection.host };
  memberBAuthedConnection.headers = {
    Authorization: authorizedB.token.access,
  };
  const cartB = await generate_random_shopping_mall_member_carts_create(
    memberBAuthedConnection,
    {
      body: {},
    },
  );
  typia.assert(cartB);
  await api.functional.shoppingMall.member.carts.erase(
    memberBAuthedConnection,
    {
      cartId: cartB.id,
    },
  );
  await TestValidator.error("deleted cart should be unavailable", async () => {
    await api.functional.shoppingMall.member.carts.at(memberBAuthedConnection, {
      cartId: cartB.id,
    });
  });
}
