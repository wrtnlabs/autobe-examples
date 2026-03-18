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

export async function test_api_cart_items_add_rejected_other_customer_cart_ownership_enforced(
  connection: api.IConnection,
): Promise<void> {
  // 1) Member A join + create cart
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuthorized = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(memberAAuthorized);
  const cartA = await generate_random_shopping_mall_member_carts_create(
    memberAConnection,
    {},
  );
  typia.assert(cartA);
  const cartIdA = cartA.id;
  const cartAWarningBefore = cartA.warning_inventory_insufficient;
  // 2) Member B join
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuthorized = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(memberBAuthorized);
  // 3) Ensure we have a valid (purchasable) product variant by creating a cart item for Member B,
  // then reuse its variant id for the unauthorized attempt.
  const cartB = await generate_random_shopping_mall_member_carts_create(
    memberBConnection,
    {},
  );
  typia.assert(cartB);
  const memberBItem =
    await generate_random_shopping_mall_member_carts_items_create(
      memberBConnection,
      {
        params: { cartId: cartB.id },
      },
    );
  typia.assert(memberBItem);
  // 4) Member B attempts to add item to Member A's cart
  await TestValidator.error(
    "reject add cart item when cart belongs to another member",
    async () => {
      await api.functional.shoppingMall.member.carts.items.create(
        memberBConnection,
        {
          cartId: cartIdA,
          body: {
            shoppingMallProductVariantId:
              memberBItem.shoppingMallProductVariantId,
            quantity: memberBItem.quantity,
          } satisfies IShoppingMallCartItem.ICreate,
        },
      );
    },
  );
  // 5) Verify cart warning flag/state for cartId_A is unchanged.
  // No cart GET endpoint is provided; attempt to reload via cart create (may reuse existing cart).
  const cartAAfter = await generate_random_shopping_mall_member_carts_create(
    memberAConnection,
    {},
  );
  typia.assert(cartAAfter);
  TestValidator.equals(
    "cart warning inventory flag unchanged",
    cartAAfter.warning_inventory_insufficient,
    cartAWarningBefore,
  );
}
