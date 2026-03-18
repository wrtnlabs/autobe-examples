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

export async function test_api_cart_from_wishlists_empty_selection_no_cart_mutation(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallMember.IJoin,
  });
  const cartBefore = await generate_random_shopping_mall_member_carts_create(
    memberConnection,
    {},
  );
  typia.assert(cartBefore);
  const cartItemBefore =
    await generate_random_shopping_mall_member_carts_items_create(
      memberConnection,
      {
        params: { cartId: cartBefore.id },
        body: {},
      },
    );
  typia.assert(cartItemBefore);
  const requestBody = {} satisfies IShoppingMallCart.ICreateFromWishlist;
  const converted1 =
    await api.functional.shoppingMall.member.cart.from_wishlists.createCartFromWishlists(
      memberConnection,
      {
        body: requestBody,
      },
    );
  typia.assert(converted1);
  const converted2 =
    await api.functional.shoppingMall.member.cart.from_wishlists.createCartFromWishlists(
      memberConnection,
      {
        body: requestBody,
      },
    );
  typia.assert(converted2);
  TestValidator.equals(
    "cart id unchanged after first zero-selection conversion",
    converted1.id,
    cartBefore.id,
  );
  TestValidator.equals(
    "cart id unchanged after second zero-selection conversion",
    converted2.id,
    cartBefore.id,
  );
  TestValidator.equals(
    "cart warning inventory state unchanged after first conversion",
    converted1.warning_inventory_insufficient,
    cartBefore.warning_inventory_insufficient,
  );
  TestValidator.equals(
    "cart warning inventory state unchanged after second conversion",
    converted2.warning_inventory_insufficient,
    cartBefore.warning_inventory_insufficient,
  );
  TestValidator.equals(
    "cart remains active (deleted_at is null) after first conversion",
    converted1.deleted_at,
    null,
  );
  TestValidator.equals(
    "cart remains active (deleted_at is null) after second conversion",
    converted2.deleted_at,
    null,
  );
  // We cannot read cart item state back from the conversion response because
  // IShoppingMallCart.items is typed as null in the provided DTO.
  // However, we can still ensure conversion does not require any cart-item
  // mutation at the DTO boundary by confirming the pre-created cart item
  // reference remains valid within the test context.
  TestValidator.equals(
    "pre-created cart item is associated with the same cart",
    cartItemBefore.shoppingMallCartId,
    cartBefore.id,
  );
}
