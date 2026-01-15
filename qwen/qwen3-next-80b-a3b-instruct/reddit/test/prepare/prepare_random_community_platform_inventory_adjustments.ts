import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformInventoryAdjustments } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformInventoryAdjustments";
export function prepare_random_community_platform_inventory_adjustments(
  input?:
    | DeepPartial<ICommunityPlatformInventoryAdjustments.ICreate>
    | undefined,
): ICommunityPlatformInventoryAdjustments.ICreate {
  return {
    productId: input?.productId ?? typia.random<string & tags.Format<"uuid">>(),
    warehouseId:
      input?.warehouseId ?? typia.random<string & tags.Format<"uuid">>(),
    quantity: input?.quantity ?? typia.random<number & tags.Type<"int32">>(),
    reason:
      input?.reason ??
      RandomGenerator.paragraph({
        sentences: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<5>
        >(),
        wordMin: 2,
        wordMax: 6,
      }),
  };
}
