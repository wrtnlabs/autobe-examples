import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSystemVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemVersion";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_system_version } from "../prepare/prepare_random_shopping_mall_system_version";

export async function generate_random_shopping_mall_administrator_system_versions_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallSystemVersion.ICreate> | undefined;
  },
): Promise<IShoppingMallSystemVersion> {
  const prepared: IShoppingMallSystemVersion.ICreate =
    prepare_random_shopping_mall_system_version(props.body);
  const result: IShoppingMallSystemVersion =
    await api.functional.shoppingMall.administrator.systemVersions.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
