import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSuperAdminPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdminPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_super_admin_password_reset } from "../prepare/prepare_random_shopping_mall_super_admin_password_reset";

export async function generate_random_shopping_mall_super_admin_password_resets_create(
  connection: api.IConnection,
  props: {
    body?:
      | DeepPartial<IShoppingMallSuperAdminPasswordReset.ICreate>
      | undefined;
  },
): Promise<IShoppingMallSuperAdminPasswordReset> {
  const prepared: IShoppingMallSuperAdminPasswordReset.ICreate =
    prepare_random_shopping_mall_super_admin_password_reset(props.body);
  return await api.functional.shoppingMall.superAdmin.password_resets.create(
    connection,
    {
      body: prepared,
    },
  );
}
