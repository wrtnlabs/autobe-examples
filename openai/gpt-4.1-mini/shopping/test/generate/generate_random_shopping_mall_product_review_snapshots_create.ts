import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallProductReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_product_review_snapshot } from "../prepare/prepare_random_shopping_mall_product_review_snapshot";

export async function generate_random_shopping_mall_product_review_snapshots_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallProductReviewSnapshot.ICreate> | undefined;
  },
): Promise<IShoppingMallProductReviewSnapshot> {
  const prepared: IShoppingMallProductReviewSnapshot.ICreate =
    prepare_random_shopping_mall_product_review_snapshot(props.body);
  const result: IShoppingMallProductReviewSnapshot =
    await api.functional.shoppingMall.productReviewSnapshots.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
