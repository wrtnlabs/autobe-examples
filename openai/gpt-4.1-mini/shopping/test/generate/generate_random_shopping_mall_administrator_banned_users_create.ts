import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBannedUser";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_banned_user } from "../prepare/prepare_random_shopping_mall_banned_user";

export async function generate_random_shopping_mall_administrator_banned_users_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallBannedUser.ICreate> | undefined;
  },
): Promise<IShoppingMallBannedUser> {
  const prepared: IShoppingMallBannedUser.ICreate =
    prepare_random_shopping_mall_banned_user(props.body);
  const result: IShoppingMallBannedUser =
    await api.functional.shoppingMall.administrator.bannedUsers.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
