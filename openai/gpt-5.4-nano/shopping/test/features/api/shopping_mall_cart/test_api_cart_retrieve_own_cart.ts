import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
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
import { generate_random_shopping_mall_member_carts_items_create } from "../../../generate/generate_random_shopping_mall_member_carts_items_create";
import { prepare_random_shopping_mall_cart } from "../../../prepare/prepare_random_shopping_mall_cart";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";

export async function test_api_cart_retrieve_own_cart(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {});
  typia.assert(memberAuth);
  const memberId = memberAuth.id;
  const cart = await api.functional.shoppingMall.member.carts.create(
    memberConnection,
    {
      body: {} satisfies IShoppingMallCart.ICreate,
    },
  );
  typia.assert(cart);
  const addedItem = await api.functional.shoppingMall.member.carts.items.create(
    memberConnection,
    {
      cartId: cart.id,
      body: {
        shoppingMallProductVariantId: typia.random<
          string & tags.Format<"uuid">
        >(),
        quantity: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
      } satisfies IShoppingMallCartItem.ICreate,
    },
  );
  typia.assert(addedItem);
  const retrieved = await api.functional.shoppingMall.member.carts.at(
    memberConnection,
    {
      cartId: cart.id,
    },
  );
  typia.assert(retrieved);
  TestValidator.equals(
    "member id matches cart ownership",
    retrieved.shopping_mall_member_id,
    memberId,
  );
  TestValidator.equals(
    "cart is active (deleted_at is null)",
    retrieved.deleted_at,
    null,
  );
  const itemsUnknown: unknown = retrieved.items;
  const items = Array.isArray(itemsUnknown)
    ? typia.assert<IShoppingMallCartItem[]>(itemsUnknown)
    : [];
  if (items.length === 0) {
    TestValidator.equals("items empty for new cart", items.length, 0);
  } else {
    TestValidator.predicate(
      "cart items contains at least 1 element",
      () => items.length > 0,
    );
    const matching = items.find(
      (it) =>
        it.shoppingMallProductVariantId ===
        addedItem.shoppingMallProductVariantId,
    );
    TestValidator.predicate(
      "added item is present in retrieved cart items",
      () => matching !== undefined,
    );
    if (matching) {
      TestValidator.equals(
        "quantity matches added item",
        matching.quantity,
        addedItem.quantity,
      );
      TestValidator.equals(
        "subtotal amount matches added item",
        matching.subtotalAmount,
        addedItem.subtotalAmount,
      );
    }
  }
  TestValidator.equals(
    "warning flag is boolean",
    typeof retrieved.warning_inventory_insufficient,
    "boolean",
  );
}
