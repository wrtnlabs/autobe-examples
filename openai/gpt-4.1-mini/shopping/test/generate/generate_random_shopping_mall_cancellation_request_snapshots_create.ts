import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_cancellation_request_snapshot } from "../prepare/prepare_random_shopping_mall_cancellation_request_snapshot";

export async function generate_random_shopping_mall_cancellation_request_snapshots_create(
  connection: api.IConnection,
  props: {
    body?:
      | DeepPartial<IShoppingMallCancellationRequestSnapshot.ICreate>
      | undefined;
  },
): Promise<IShoppingMallCancellationRequestSnapshot> {
  const prepared: IShoppingMallCancellationRequestSnapshot.ICreate =
    prepare_random_shopping_mall_cancellation_request_snapshot(props.body);
  const result: IShoppingMallCancellationRequestSnapshot =
    await api.functional.shoppingMall.cancellationRequestSnapshots.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
