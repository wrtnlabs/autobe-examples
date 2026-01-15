import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformInventoryMovements } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformInventoryMovements";
export function prepare_random_community_platform_inventory_movements(
  input?: DeepPartial<ICommunityPlatformInventoryMovements.ICreate> | undefined,
): ICommunityPlatformInventoryMovements.ICreate {
  return {
    product_variant_id:
      input?.product_variant_id ?? typia.random<string & tags.Format<"uuid">>(),
    source_warehouse_id:
      input?.source_warehouse_id ??
      typia.random<string & tags.Format<"uuid">>(),
    destination_warehouse_id:
      input?.destination_warehouse_id ??
      typia.random<string & tags.Format<"uuid">>(),
    quantity:
      input?.quantity ??
      typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    movement_type:
      input?.movement_type ??
      RandomGenerator.pick([
        "INBOUND",
        "OUTBOUND",
        "TRANSFER",
        "ADJUSTMENT",
        "RETURN",
      ] as const),
    notes: input?.notes ?? RandomGenerator.paragraph({ sentences: 1 }),
  };
}
