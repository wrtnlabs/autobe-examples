import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_product_variant_snapshot } from "../prepare/prepare_random_shopping_mall_product_variant_snapshot";

export async function generate_random_shopping_mall_member_product_variant_snapshots_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallProductVariantSnapshot.ICreate> | undefined;
  },
): Promise<IShoppingMallProductVariantSnapshot> {
  const prepared: IShoppingMallProductVariantSnapshot.ICreate =
    prepare_random_shopping_mall_product_variant_snapshot(props.body);
  const result: IShoppingMallProductVariantSnapshot =
    await api.functional.shoppingMall.member.productVariantSnapshots.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
