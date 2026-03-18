import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSnapshot";
import type { IShoppingMallSnapshotParty } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSnapshotParty";
import type { IShoppingMallSnapshotPayload } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSnapshotPayload";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_snapshot } from "../prepare/prepare_random_shopping_mall_snapshot";

export async function generate_random_shopping_mall_admin_snapshots_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallSnapshot.ICreate> | undefined;
  },
): Promise<IShoppingMallSnapshot> {
  const prepared: IShoppingMallSnapshot.ICreate =
    prepare_random_shopping_mall_snapshot(props.body);
  return await api.functional.shoppingMall.admin.snapshots.create(connection, {
    body: prepared,
  });
}
