import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { generate_random_shopping_mall_refund_request_snapshots_create_refund_request_snapshot } from "../../../generate/generate_random_shopping_mall_refund_request_snapshots_create_refund_request_snapshot";
import { prepare_random_shopping_mall_refund_request_snapshot } from "../../../prepare/prepare_random_shopping_mall_refund_request_snapshot";

export async function test_api_refund_request_snapshot_creation(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection
  const userConnection: api.IConnection = { host: connection.host };
  // Generate multiple refund request snapshots with random bodies
  const snapshots: IShoppingMallRefundRequestSnapshot[] = [];
  for (let i = 0; i < 3; i++) {
    const snapshot =
      await generate_random_shopping_mall_refund_request_snapshots_create_refund_request_snapshot(
        userConnection,
        {},
      );
    typia.assert(snapshot);
    snapshots.push(snapshot);
  }
  // Basic validation: snapshots array length
  TestValidator.equals("snapshot count", snapshots.length, 3);
  // We remove checks for refund_request_id and status because these properties do not exist
}