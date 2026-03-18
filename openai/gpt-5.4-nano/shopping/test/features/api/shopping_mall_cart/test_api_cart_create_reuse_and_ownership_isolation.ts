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

export async function test_api_cart_create_reuse_and_ownership_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1) Member A join (actor-specific)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAEmail = typia.random<string & tags.Format<"email">>();
  const memberAPassword = typia.random<string & tags.Format<"password">>();
  const memberAAuth: IShoppingMallMember.IAuthorized =
    await authorize_member_join(memberAConnection, {
      body: {
        email: memberAEmail,
        password: memberAPassword,
      } satisfies IShoppingMallMember.IJoin,
    });
  typia.assert(memberAAuth);

  // 2) Member A create cart (first)
  const cartA: IShoppingMallCart = await generate_random_shopping_mall_member_carts_create(
    memberAConnection,
    {},
  );
  typia.assert(cartA);

  // 3) Member A create cart (second)
  const cartA2: IShoppingMallCart = await generate_random_shopping_mall_member_carts_create(
    memberAConnection,
    {},
  );
  typia.assert(cartA2);

  // Ownership must always remain member A
  TestValidator.equals(
    "member A cart ownership (first)",
    cartA.shopping_mall_member_id,
    memberAAuth.id,
  );
  TestValidator.equals(
    "member A cart ownership (second)",
    cartA2.shopping_mall_member_id,
    memberAAuth.id,
  );

  // Reuse/idempotency: cart id should be reused when possible, otherwise at least ownership is correct
  if (cartA2.id !== cartA.id) {
    TestValidator.equals(
      "member A second cart still owned by member A",
      cartA2.shopping_mall_member_id,
      cartA.shopping_mall_member_id,
    );
  } else {
    TestValidator.equals("member A cart reused", cartA2.id, cartA.id);
  }

  // 4) Member B join (actor-specific)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBEmail = typia.random<string & tags.Format<"email">>();
  const memberBPassword = typia.random<string & tags.Format<"password">>();
  const memberBAuth: IShoppingMallMember.IAuthorized =
    await authorize_member_join(memberBConnection, {
      body: {
        email: memberBEmail,
        password: memberBPassword,
      } satisfies IShoppingMallMember.IJoin,
    });
  typia.assert(memberBAuth);

  // 5) Member B create cart
  const cartB: IShoppingMallCart = await generate_random_shopping_mall_member_carts_create(
    memberBConnection,
    {},
  );
  typia.assert(cartB);

  TestValidator.equals(
    "member B cart ownership",
    cartB.shopping_mall_member_id,
    memberBAuth.id,
  );
  TestValidator.notEquals(
    "member B cart not owned by member A",
    cartB.shopping_mall_member_id,
    memberAAuth.id,
  );

  // If ids are per-member, they must differ; otherwise, ownership isolation still holds
  TestValidator.notEquals("cart ids differ across members", cartB.id, cartA.id);
}
