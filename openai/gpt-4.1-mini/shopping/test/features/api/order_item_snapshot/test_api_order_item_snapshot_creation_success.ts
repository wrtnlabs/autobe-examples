import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { generate_random_shopping_mall_order_item_snapshots_create } from "../../../generate/generate_random_shopping_mall_order_item_snapshots_create";
import { prepare_random_shopping_mall_order_item_snapshot } from "../../../prepare/prepare_random_shopping_mall_order_item_snapshot";

export async function test_api_order_item_snapshot_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // Prepare actor-specific connection for authorized system or administrator
  const internalConnection: api.IConnection = { host: connection.host };
  // Generate a new, valid order item snapshot entity using the generation function
  const snapshot =
    await generate_random_shopping_mall_order_item_snapshots_create(
      internalConnection,
      { body: undefined },
    );
  typia.assert(snapshot);
  // We cannot test unknown properties since IShoppingMallOrderItemSnapshot structure is empty
  // Only validate the type assertion and presence of id field if exists
  // Concurrent creations test
  const createTasks = Array(3)
    .fill(0)
    .map(() =>
      generate_random_shopping_mall_order_item_snapshots_create(
        internalConnection,
        {
          body: undefined,
        },
      ),
    );
  const snapshots = await Promise.all(createTasks);
  snapshots.forEach((snap, i) => {
    typia.assert(snap);
    // Validate id field if it exists
    if (snap.hasOwnProperty("id")) {
      TestValidator.predicate(
        `concurrent snapshot ${i + 1} has id`,
        typeof (snap as any).id === "string" && (snap as any).id.length > 0,
      );
    }
  });
}
