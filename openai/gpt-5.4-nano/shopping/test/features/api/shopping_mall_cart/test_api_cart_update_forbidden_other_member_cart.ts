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

export async function test_api_cart_update_forbidden_other_member_cart(
  connection: api.IConnection,
): Promise<void> {
  // 1) Member A joins and creates its cart
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAEmail = typia.random<string & tags.Format<"email">>();
  const memberAPassword = RandomGenerator.alphaNumeric(16);
  await authorize_member_join(memberAConnection, {
    body: {
      email: memberAEmail,
      password: memberAPassword satisfies string & tags.Format<"password">,
    },
  });
  const memberAActorConnection: api.IConnection = { host: connection.host };
  // authorize_member_join mutates the provided connection's headers; keep using it.
  Object.assign(memberAActorConnection, memberAConnection);
  const cartA = await generate_random_shopping_mall_member_carts_create(
    memberAActorConnection,
    { body: {} },
  );
  typia.assert(cartA);
  const cartId: string & tags.Format<"uuid"> = cartA.id;
  // 2) Capture semantic state using a non-authoritative PUT by the owner.
  const ownerBeforeUpdate =
    await api.functional.shoppingMall.member.carts.update(
      memberAActorConnection,
      {
        cartId,
        body: {
          warning_inventory_insufficient: cartA.warning_inventory_insufficient,
        } satisfies IShoppingMallCart.IUpdate,
      },
    );
  typia.assert(ownerBeforeUpdate);
  const beforeWarning = ownerBeforeUpdate.warning_inventory_insufficient;
  const beforeItems = ownerBeforeUpdate.items; // DTO defines items as null
  // 3) Member B joins and tries to update member A's cart
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBEmail = typia.random<string & tags.Format<"email">>();
  const memberBPassword = RandomGenerator.alphaNumeric(16);
  await authorize_member_join(memberBConnection, {
    body: {
      email: memberBEmail,
      password: memberBPassword satisfies string & tags.Format<"password">,
    },
  });
  const memberBActorConnection: api.IConnection = { host: connection.host };
  Object.assign(memberBActorConnection, memberBConnection);
  await TestValidator.error(
    "should reject updating another member's cart",
    async () => {
      await api.functional.shoppingMall.member.carts.update(
        memberBActorConnection,
        {
          cartId,
          body: {
            warning_inventory_insufficient: !beforeWarning,
          } satisfies IShoppingMallCart.IUpdate,
        },
      );
    },
  );
  // 4) Validate persisted state is unchanged for member A
  const ownerAfterUpdate =
    await api.functional.shoppingMall.member.carts.update(
      memberAActorConnection,
      {
        cartId,
        body: {
          warning_inventory_insufficient: beforeWarning,
        } satisfies IShoppingMallCart.IUpdate,
      },
    );
  typia.assert(ownerAfterUpdate);
  TestValidator.equals(
    "warning_inventory_insufficient unchanged",
    ownerAfterUpdate.warning_inventory_insufficient,
    beforeWarning,
  );
  TestValidator.equals(
    "cart items summary unchanged",
    ownerAfterUpdate.items,
    beforeItems,
  );
}
