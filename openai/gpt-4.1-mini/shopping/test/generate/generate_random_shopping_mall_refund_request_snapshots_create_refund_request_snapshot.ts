import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_refund_request_snapshot } from "../prepare/prepare_random_shopping_mall_refund_request_snapshot";

export async function generate_random_shopping_mall_refund_request_snapshots_create_refund_request_snapshot(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallRefundRequestSnapshot.ICreate> | undefined;
  },
): Promise<IShoppingMallRefundRequestSnapshot> {
  const prepared: IShoppingMallRefundRequestSnapshot.ICreate =
    prepare_random_shopping_mall_refund_request_snapshot(props.body);
  const result: IShoppingMallRefundRequestSnapshot =
    await api.functional.shoppingMall.refundRequestSnapshots.createRefundRequestSnapshot(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
