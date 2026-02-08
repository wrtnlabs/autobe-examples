import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfileSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { generate_random_shopping_mall_seller_profile_snapshots_create_seller_profile_snapshot } from "../../../generate/generate_random_shopping_mall_seller_profile_snapshots_create_seller_profile_snapshot";
import { prepare_random_shopping_mall_seller_profile_snapshot } from "../../../prepare/prepare_random_shopping_mall_seller_profile_snapshot";

export async function test_api_seller_profile_snapshot_creation_valid(
  connection: api.IConnection,
): Promise<void> {
  // Create an actor-specific connection
  const userConnection: api.IConnection = { host: connection.host };
  // Create a snapshot with random data
  const createdSnapshot =
    await generate_random_shopping_mall_seller_profile_snapshots_create_seller_profile_snapshot(
      userConnection,
      {},
    );
  // Assert the created snapshot is valid
  typia.assert(createdSnapshot);
}
