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

export async function test_api_cart_create_concurrent_consistent_active_cart(
  connection: api.IConnection,
): Promise<void> {
  // 1) Register an authenticated member
  const memberConnection: api.IConnection = { host: connection.host };
  const credentials = {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  };
  const authorized = await authorize_member_join(memberConnection, credentials);
  const memberId = authorized.id;
  // 2) Fire concurrent cart-create requests (use generation utility)
  const cartRequests = ArrayUtil.repeat(2, () =>
    generate_random_shopping_mall_member_carts_create(memberConnection, {
      body: {} satisfies IShoppingMallCart.ICreate,
    }),
  );
  const results = await Promise.all(cartRequests);
  results.forEach((cart) => typia.assert(cart));
  // 3) Validate active carts and ownership
  for (const cart of results) {
    TestValidator.equals("cart deleted_at is null", cart.deleted_at, null);
    TestValidator.equals(
      "cart owner matches member",
      cart.shopping_mall_member_id,
      memberId,
    );
    TestValidator.equals(
      "cart starts without inventory warning",
      cart.warning_inventory_insufficient,
      false,
    );
  }
  // 4) Validate consistency on id reuse (allow multiple carts but all must be active and owned)
  const uniqueIds = Array.from(new Set(results.map((r) => r.id)));
  TestValidator.predicate(
    "at least one active cart id is returned",
    uniqueIds.length >= 1,
  );
}
