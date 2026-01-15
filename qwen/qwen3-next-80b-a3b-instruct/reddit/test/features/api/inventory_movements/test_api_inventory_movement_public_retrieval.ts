import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformInventoryMovements } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformInventoryMovements";
export async function test_api_inventory_movement_public_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Generate a valid UUID for movementId
  const movementId = typia.random<string & tags.Format<"uuid">>();
  // Call the public API endpoint to retrieve inventory movement record
  const movement =
    await api.functional.communityPlatform.inventory_movements.at(connection, {
      movementId,
    });
  // Validate the response type and structure - typia.assert() handles all schema constraints including tags.Minimum<0>
  typia.assert<ICommunityPlatformInventoryMovements>(movement);
}
