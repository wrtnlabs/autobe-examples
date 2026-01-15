import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformInventoryItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformInventoryItem";
export async function test_api_inventory_overview_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Fetch the inventory overview data
  const inventoryOverview: ICommunityPlatformInventoryItem =
    await api.functional.communityPlatform.inventory.stocks.overview.index(
      connection,
    );
  // Validate that the response is not empty and follows the expected string format
  typia.assert(inventoryOverview);
  // Verify the inventory overview string is not empty
  TestValidator.predicate(
    "inventory overview string is not empty",
    inventoryOverview.length > 0,
  );
}
