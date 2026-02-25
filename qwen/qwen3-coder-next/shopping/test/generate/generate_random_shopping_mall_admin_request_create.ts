import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_admin } from "../prepare/prepare_random_shopping_mall_admin";

export async function generate_random_shopping_mall_admin_request_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallAdmin.ICreate>;
  },
): Promise<void> {
  const prepared: IShoppingMallAdmin.ICreate =
    prepare_random_shopping_mall_admin(props.body);
  return await api.functional.shoppingMall.admin.request.create(connection, {
    body: prepared,
  });
}
