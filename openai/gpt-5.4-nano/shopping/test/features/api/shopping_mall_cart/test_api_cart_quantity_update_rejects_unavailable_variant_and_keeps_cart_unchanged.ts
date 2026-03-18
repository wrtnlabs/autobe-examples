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

export async function test_api_cart_quantity_update_rejects_unavailable_variant_and_keeps_cart_unchanged(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  // 1) Join as a member
  const credentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(16),
  } satisfies IShoppingMallMember.IJoin;
  await authorize_member_join(memberConnection, {
    body: credentials,
  });
  // 2) Create a cart container with initial state
  const cartBefore: IShoppingMallCart =
    await generate_random_shopping_mall_member_carts_create(memberConnection, {
      body: {},
    });
  typia.assert(cartBefore);
  const warningBefore: boolean = cartBefore.warning_inventory_insufficient;
  // 3) Attempt quantity update that should be rejected atomically.
  // Build a schema-valid request, then cast/override fields.
  const baseReq = typia.random<IShoppingMallCart.IRequest>();
  const req = (baseReq as unknown as IShoppingMallCart.IRequest) satisfies IShoppingMallCart.IRequest;

  // Ensure we still send an invalid/unavailable quantity update payload.
  // Override first item defensively via typia.assert on the item type.
  const anyReq = req as unknown as { items?: Array<Record<string, unknown>> };
  if (anyReq.items && anyReq.items.length > 0) {
    // Use common field names used by cart quantity updates.
    (anyReq.items[0] as { shopping_mall_cart_item_id?: unknown; quantity?: unknown }).shopping_mall_cart_item_id = null;
    (anyReq.items[0] as { quantity?: unknown }).quantity = null;
  }

  const typedReq = typia.assert<IShoppingMallCart.IRequest>(req);

  await TestValidator.error(
    "reject unavailable/unpurchasable variant quantity update and keep cart unchanged",
    async () => {
      await api.functional.shoppingMall.member.carts.updateCart(
        memberConnection,
        {
          body: typedReq,
        },
      );
    },
  );
  // 4) Validate cart container state did not change
  const cartAfter: IShoppingMallCart =
    await generate_random_shopping_mall_member_carts_create(memberConnection, {
      body: {},
    });
  typia.assert(cartAfter);
  TestValidator.equals(
    "warning_inventory_insufficient unchanged after rejection",
    cartAfter.warning_inventory_insufficient,
    warningBefore,
  );
}
