import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSystematicFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystematicFeatureFlag";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_systematic_feature_flag } from "../prepare/prepare_random_shopping_mall_systematic_feature_flag";

export async function generate_random_shopping_mall_super_admin_feature_flags_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallSystematicFeatureFlag.ICreate> | undefined;
  },
): Promise<IShoppingMallSystematicFeatureFlag> {
  const prepared: IShoppingMallSystematicFeatureFlag.ICreate =
    prepare_random_shopping_mall_systematic_feature_flag(props.body);
  return await api.functional.shoppingMall.superAdmin.feature_flags.create(
    connection,
    {
      body: prepared,
    },
  );
}
