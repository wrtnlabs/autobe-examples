import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformInventoryMovements } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformInventoryMovements";
export async function test_api_inventory_turnover_ratio_calculation(
  connection: api.IConnection,
): Promise<void> {
  const ratioData =
    await api.functional.communityPlatform.inventory.turnovers.ratio.index(
      connection,
    );
  typia.assert(ratioData);
  TestValidator.predicate("ratio is non-negative", ratioData.ratio >= 0);
}
