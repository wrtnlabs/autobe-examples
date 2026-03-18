import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSnapshotParty } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSnapshotParty";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_snapshot_party } from "../prepare/prepare_random_shopping_mall_snapshot_party";

export async function generate_random_shopping_mall_admin_snapshots_parties_create_snapshot_party(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallSnapshotParty.ICreate> | undefined;
    params: {
      snapshotId: string;
    };
  },
): Promise<IShoppingMallSnapshotParty> {
  const prepared: IShoppingMallSnapshotParty.ICreate =
    prepare_random_shopping_mall_snapshot_party(props.body);
  return await api.functional.shoppingMall.admin.snapshots.parties.createSnapshotParty(
    connection,
    {
      body: prepared,
      snapshotId: props.params.snapshotId,
    },
  );
}
