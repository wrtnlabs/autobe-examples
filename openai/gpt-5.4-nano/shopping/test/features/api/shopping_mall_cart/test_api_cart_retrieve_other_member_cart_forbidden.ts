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

export async function test_api_cart_retrieve_other_member_cart_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // 1) Member A joins
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  // 2) Member B joins
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  // 3) Member A creates a cart
  const memberACart = await generate_random_shopping_mall_member_carts_create(
    memberAConnection,
    {},
  );
  typia.assert(memberACart);
  // 4) Member B tries to retrieve Member A's cart
  const forbiddenAttempt = async () =>
    await api.functional.shoppingMall.member.carts.at(memberBConnection, {
      cartId: memberACart.id,
    });
  await TestValidator.httpError(
    "member B must not be able to retrieve member A cart",
    [401, 403, 404],
    forbiddenAttempt,
  );
  // 5) Strengthening: Member A can still retrieve their own cart
  const memberARetrieve = await api.functional.shoppingMall.member.carts.at(
    memberAConnection,
    { cartId: memberACart.id },
  );
  typia.assert(memberARetrieve);
  TestValidator.equals(
    "cart id must match",
    memberARetrieve.id,
    memberACart.id,
  );
  TestValidator.equals(
    "cart owner must match member A",
    memberARetrieve.shopping_mall_member_id,
    memberA.id,
  );
}
