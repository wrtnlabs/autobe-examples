import { IEcommercePlatformInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformInventoryRecord";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random ecommerce platform inventory record creation data for E2E testing.
 *
 * Generates a complete IEcommercePlatformInventoryRecord.ICreate with randomized values
 * for quantity_delta (stock change) and reason (business justification).
 */
export function prepare_random_ecommerce_platform_inventory_record(
  input?: DeepPartial<IEcommercePlatformInventoryRecord.ICreate>,
): IEcommercePlatformInventoryRecord.ICreate {
  return {
    quantity_delta:
      input?.quantity_delta ?? typia.random<number & tags.Type<"int32">>(),
    reason: input?.reason ?? RandomGenerator.paragraph({ sentences: 2 }),
  };
}
