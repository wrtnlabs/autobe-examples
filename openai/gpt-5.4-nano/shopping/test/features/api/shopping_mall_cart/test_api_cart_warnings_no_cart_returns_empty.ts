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

export async function test_api_cart_warnings_no_cart_returns_empty(
  connection: api.IConnection,
): Promise<void> {
  // No active cart returns empty warnings without leaking other users’ data
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {
    body: undefined,
  });
  typia.assert(member1);
  const warnings1 =
    await api.functional.shoppingMall.member.cart.warnings.atCartWarnings(
      member1Connection,
    );
  typia.assert(warnings1);
  TestValidator.equals("member1 cart has no items", warnings1.items, null);
  TestValidator.equals(
    "member1 cart warning_inventory_insufficient is false",
    warnings1.warning_inventory_insufficient,
    false,
  );
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {
    body: undefined,
  });
  typia.assert(member2);
  const warnings2 =
    await api.functional.shoppingMall.member.cart.warnings.atCartWarnings(
      member2Connection,
    );
  typia.assert(warnings2);
  TestValidator.equals("member2 cart has no items", warnings2.items, null);
  TestValidator.equals(
    "member2 cart warning_inventory_insufficient is false",
    warnings2.warning_inventory_insufficient,
    false,
  );
  TestValidator.notEquals(
    "cart data should not leak between members",
    warnings1.shopping_mall_member_id,
    warnings2.shopping_mall_member_id,
  );
}
