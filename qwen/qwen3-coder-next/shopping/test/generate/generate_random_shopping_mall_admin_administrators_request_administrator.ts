import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_admin } from "../prepare/prepare_random_shopping_mall_admin";

export async function generate_random_shopping_mall_admin_administrators_request_administrator(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallAdmin.ICreate>;
  },
): Promise<IShoppingMallAdmin> {
  const prepared: IShoppingMallAdmin.ICreate =
    prepare_random_shopping_mall_admin(props.body);
  const result: IShoppingMallAdmin =
    await api.functional.shoppingMall.admin.administrators.requestAdministrator(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
