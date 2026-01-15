import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformInventoryBatches } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformInventoryBatches";
export async function test_api_inventory_batch_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Generate a valid UUID for batchId using typia.random with format constraint
  const batchId: string = typia.random<string & tags.Format<"uuid">>();
  // Call the API endpoint to retrieve inventory batch details
  const batch: ICommunityPlatformInventoryBatches =
    await api.functional.communityPlatform.inventory_batches.at(connection, {
      batchId,
    });
  // Validate the response structure and types with typia.assert
  typia.assert(batch);
}
