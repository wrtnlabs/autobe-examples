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
import { prepare_random_shopping_mall_cart } from "../../../prepare/prepare_random_shopping_mall_cart";

export async function test_api_cart_update_rejects_other_member_cart_items(
  connection: api.IConnection,
): Promise<void> {
  // 1) Member A joins
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuth = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16) satisfies string &
        tags.Format<"password">,
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(memberAAuth);

  // 2) Member B joins
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuth = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16) satisfies string &
        tags.Format<"password">,
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(memberBAuth);

  // 3) Create carts and capture cart-level state
  const memberACartBefore =
    await generate_random_shopping_mall_member_carts_create(
      memberAConnection,
      {},
    );
  typia.assert(memberACartBefore);

  const memberBCartBefore =
    await generate_random_shopping_mall_member_carts_create(
      memberBConnection,
      {},
    );
  typia.assert(memberBCartBefore);

  // 4) Attempt cross-member cart update under Member A context.
  const unsafePayload: unknown = [
    {
      // keep values aligned with the intent; validated/cast to the DTO below
      shopping_mall_cart_item_id: null,
      quantity: null,
    },
  ];

  const updateRequest = typia.assert<IShoppingMallCart.IRequest>(unsafePayload);

  await TestValidator.error(
    "reject cross-member cart item update",
    async () => {
      await api.functional.shoppingMall.member.carts.updateCart(
        memberAConnection,
        {
          body: updateRequest,
        },
      );
    },
  );

  // 5) Re-check cart-level state (warning flag). Cart items are not available
  // via provided DTOs.
  const memberACartAfter =
    await api.functional.shoppingMall.member.carts.create(memberAConnection, {
      body: {},
    });
  typia.assert(memberACartAfter);

  const memberBCartAfter =
    await api.functional.shoppingMall.member.carts.create(memberBConnection, {
      body: {},
    });
  typia.assert(memberBCartAfter);

  TestValidator.equals(
    "member A cart warning flag should remain unchanged",
    memberACartAfter.warning_inventory_insufficient,
    memberACartBefore.warning_inventory_insufficient,
  );

  TestValidator.equals(
    "member B cart warning flag should remain unchanged",
    memberBCartAfter.warning_inventory_insufficient,
    memberBCartBefore.warning_inventory_insufficient,
  );
}
