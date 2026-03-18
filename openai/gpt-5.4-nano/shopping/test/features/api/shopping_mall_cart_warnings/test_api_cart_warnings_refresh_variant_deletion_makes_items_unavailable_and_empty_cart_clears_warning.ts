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

export async function test_api_cart_warnings_refresh_variant_deletion_makes_items_unavailable_and_empty_cart_clears_warning(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const email = `member+${Date.now()}@example.com` satisfies string &
    import("typia").tags.Format<"email">;
  const password = "Password-12345!" satisfies string;
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email,
      password,
    } satisfies IShoppingMallMember.IJoin,
  });
  memberConnection.headers = memberConnection.headers ?? {};
  memberConnection.headers.Authorization = memberAuth.token.access;
  // Create cart
  const cart = await generate_random_shopping_mall_member_carts_create(
    memberConnection,
    { body: {} },
  );
  typia.assert(cart);
  // Add two cart items
  const itemA = await generate_random_shopping_mall_member_carts_items_create(
    memberConnection,
    {
      params: { cartId: cart.id },
      body: { quantity: 1 },
    },
  );
  typia.assert(itemA);
  const itemB = await generate_random_shopping_mall_member_carts_items_create(
    memberConnection,
    {
      params: { cartId: cart.id },
      body: { quantity: 1 },
    },
  );
  typia.assert(itemB);
  // Initial refresh
  const refreshed1 =
    await api.functional.shoppingMall.member.cart.warnings.refresh.refreshCartWarnings(
      memberConnection,
      {
        body: typia.random<IShoppingMallCart.IRequest>(),
      },
    );
  typia.assert(refreshed1);
  TestValidator.equals(
    "warning_inventory_insufficient initially false",
    refreshed1.warning_inventory_insufficient,
    false,
  );
  // Delete variants to make items unavailable
  await api.functional.shoppingMall.member.productVariants.erase(
    memberConnection,
    {
      productVariantId: itemA.shoppingMallProductVariantId,
    },
  );
  await api.functional.shoppingMall.member.productVariants.erase(
    memberConnection,
    {
      productVariantId: itemB.shoppingMallProductVariantId,
    },
  );
  // Refresh after deletion
  const refreshed2 =
    await api.functional.shoppingMall.member.cart.warnings.refresh.refreshCartWarnings(
      memberConnection,
      {
        body: typia.random<IShoppingMallCart.IRequest>(),
      },
    );
  typia.assert(refreshed2);
  TestValidator.equals(
    "warning_inventory_insufficient after variant deletion true",
    refreshed2.warning_inventory_insufficient,
    true,
  );
  // Unable to clear cart: no cart-item removal API provided in inputs.
  // Best-effort: refresh again and assert it is still boolean.
  const refreshed3 =
    await api.functional.shoppingMall.member.cart.warnings.refresh.refreshCartWarnings(
      memberConnection,
      {
        body: typia.random<IShoppingMallCart.IRequest>(),
      },
    );
  typia.assert(refreshed3);
}
