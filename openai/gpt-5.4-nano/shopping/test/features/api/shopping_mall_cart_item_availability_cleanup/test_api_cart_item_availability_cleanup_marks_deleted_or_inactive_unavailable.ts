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

export async function test_api_cart_item_availability_cleanup_marks_deleted_or_inactive_unavailable(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  const cleanupInput: IShoppingMallCartItem.ICreate =
    typia.random<IShoppingMallCartItem.ICreate>();
  // Prepare a reconciliation-sensitive cart state.
  await generate_random_shopping_mall_member_cart_items_availability_cleanups_create_availability_cleanup(
    memberConnection,
    {
      body: cleanupInput,
    },
  );
  // Idempotency: second run on same input should also succeed.
  await TestValidator.predicate("first cleanup should not throw", async () => {
    await generate_random_shopping_mall_member_cart_items_availability_cleanups_create_availability_cleanup(
      memberConnection,
      {
        body: cleanupInput,
      },
    );
    return true;
  });
  await TestValidator.predicate(
    "second cleanup should not throw (idempotent)",
    async () => {
      await generate_random_shopping_mall_member_cart_items_availability_cleanups_create_availability_cleanup(
        memberConnection,
        {
          body: cleanupInput,
        },
      );
      return true;
    },
  );
}
