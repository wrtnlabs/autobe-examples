import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSystematicVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystematicVersion";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_systematic_version } from "../prepare/prepare_random_shopping_mall_systematic_version";

export async function generate_random_shopping_mall_super_admin_versions_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallSystematicVersion.ICreate> | undefined;
  },
): Promise<IShoppingMallSystematicVersion> {
  const prepared: IShoppingMallSystematicVersion.ICreate =
    prepare_random_shopping_mall_systematic_version(props.body);
  return await api.functional.shoppingMall.superAdmin.versions.create(
    connection,
    {
      body: prepared,
    },
  );
}
