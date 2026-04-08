import { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random inventory record creation data for E2E testing.
 *
 * Generates a complete IEcommerceMallInventoryRecord.ICreate with randomized
 * values. The quantityChange can be positive (restocking) or negative
 * (adjustment), and reason describes the business context for the change.
 *
 * Both properties are test-customizable via the optional input parameter.
 * For quantityChange, a random non-zero int32 value is generated.
 * For reason, a descriptive paragraph is generated to explain the business context.
 */
export function prepare_random_ecommerce_mall_inventory_record(
  input?: DeepPartial<IEcommerceMallInventoryRecord.ICreate>,
): IEcommerceMallInventoryRecord.ICreate {
  return {
    quantityChange:
      input?.quantityChange ??
      (Math.random() > 0.5 ? 1 : -1) *
        typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    reason: input?.reason ?? RandomGenerator.paragraph({ sentences: 2 }),
  };
}
