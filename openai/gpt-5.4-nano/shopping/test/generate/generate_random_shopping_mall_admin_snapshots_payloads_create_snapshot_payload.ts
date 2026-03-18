import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSnapshotPayload } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSnapshotPayload";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_snapshot_payload } from "../prepare/prepare_random_shopping_mall_snapshot_payload";

export async function generate_random_shopping_mall_admin_snapshots_payloads_create_snapshot_payload(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallSnapshotPayload.ICreate> | undefined;
    params: {
      snapshotId: string;
    };
  },
): Promise<IShoppingMallSnapshotPayload> {
  const prepared: IShoppingMallSnapshotPayload.ICreate =
    prepare_random_shopping_mall_snapshot_payload(props.body);
  return await api.functional.shoppingMall.admin.snapshots.payloads.createSnapshotPayload(
    connection,
    {
      snapshotId: props.params.snapshotId,
      body: prepared,
    },
  );
}
