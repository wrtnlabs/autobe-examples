import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformInventoryProcurementOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformInventoryProcurementOrder";
export function prepare_random_community_platform_inventory_procurement_order(
  input?: DeepPartial<ICommunityPlatformInventoryProcurementOrder.ICreate>,
): ICommunityPlatformInventoryProcurementOrder.ICreate {
  return {
    target_inventory_item:
      input?.target_inventory_item ?? RandomGenerator.alphaNumeric(12),
    desired_quantity:
      input?.desired_quantity ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
      >(),
    justification:
      input?.justification ??
      RandomGenerator.paragraph({
        sentences: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<5>
        >(),
        wordMin: 3,
        wordMax: 7,
      }),
    budget_allocation_id:
      input?.budget_allocation_id ??
      typia.random<string & tags.Format<"uuid">>(),
    expected_delivery_date:
      input?.expected_delivery_date ??
      new Date(
        Date.now() +
          typia.random<
            number &
              tags.Type<"uint32"> &
              tags.Minimum<86400000> &
              tags.Maximum<2592000000>
          >(),
      ).toISOString(),
  };
}
