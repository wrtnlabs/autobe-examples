import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_review_snapshot } from "../prepare/prepare_random_shopping_mall_review_snapshot";

export async function generate_random_shopping_mall_administrator_review_snapshots_create_review_snapshot(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallReviewSnapshot.ICreate> | undefined;
  },
): Promise<IShoppingMallReviewSnapshot> {
  const prepared: IShoppingMallReviewSnapshot.ICreate =
    prepare_random_shopping_mall_review_snapshot(props.body);
  return await api.functional.shoppingMall.administrator.reviewSnapshots.createReviewSnapshot(
    connection,
    {
      body: prepared,
    },
  );
}
