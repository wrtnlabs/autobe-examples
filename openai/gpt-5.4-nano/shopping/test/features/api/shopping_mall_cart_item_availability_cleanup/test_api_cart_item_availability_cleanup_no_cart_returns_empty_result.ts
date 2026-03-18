import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_shopping_mall_member_cart_items_availability_cleanups_create_availability_cleanup } from "../../../generate/generate_random_shopping_mall_member_cart_items_availability_cleanups_create_availability_cleanup";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";

export async function test_api_cart_item_availability_cleanup_no_cart_returns_empty_result(
  connection: api.IConnection,
): Promise<void> {
  // Create a new member (fresh account should not have an active cart)
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(member);
  const userConnection: api.IConnection = { host: connection.host };
  userConnection.headers = memberConnection.headers;
  // Ensure request body uses correct DTO shape (scoped reconciliation input)
  const body = typia.random<IShoppingMallCartItem.ICreate>();
  // 1st cleanup call: should no-op because there is no active cart
  const result1 =
    await generate_random_shopping_mall_member_cart_items_availability_cleanups_create_availability_cleanup(
      userConnection,
      { body },
    );
  // generator returns void
  TestValidator.predicate(
    "cleanup no cart should not throw",
    () => result1 === undefined,
  );
  // 2nd cleanup call: still no-op and consistent
  const result2 =
    await generate_random_shopping_mall_member_cart_items_availability_cleanups_create_availability_cleanup(
      userConnection,
      { body },
    );
  TestValidator.predicate(
    "cleanup no cart should remain no-op",
    () => result2 === undefined,
  );
}
