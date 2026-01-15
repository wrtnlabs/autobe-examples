import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformInventoryBatches } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformInventoryBatches";
export function prepare_random_community_platform_inventory_batches(
  input?: DeepPartial<ICommunityPlatformInventoryBatches.ICreate>,
): ICommunityPlatformInventoryBatches.ICreate {
  return {
    supplier_id: typia.random<string & tags.Format<"uuid">>(),
    product_id: typia.random<string & tags.Format<"uuid">>(),
    quantity: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    batch_number: `BATCH-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, "0")}${String(new Date().getDate()).padStart(2, "0")}-${String(typia.random<number & tags.Type<"uint32"> & tags.Maximum<9999>>()).padStart(4, "0")}`,
    received_at: RandomGenerator.date(
      new Date(),
      1000 * 60 * 60 * 24 * 30,
    ).toISOString(),
    notes:
      input?.notes ??
      RandomGenerator.paragraph({
        sentences: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<10>
        >(),
        wordMin: 3,
        wordMax: 8,
      }),
  };
}
