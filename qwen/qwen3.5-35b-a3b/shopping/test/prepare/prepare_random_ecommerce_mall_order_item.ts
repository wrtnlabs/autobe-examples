import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random order item creation data for E2E testing.
 *
 * Generates a complete IEcommerceMallOrderItem.ICreate with randomized values.
 * Creates order item data for adding product variants to orders during checkout.
 * All fields are test-customizable via the input parameter for flexible test scenarios.
 */
export function prepare_random_ecommerce_mall_order_item(
  input?: DeepPartial<IEcommerceMallOrderItem.ICreate>,
): IEcommerceMallOrderItem.ICreate {
  return {
    product_variant_id:
      input?.product_variant_id ?? typia.random<string & tags.Format<"uuid">>(),
    quantity:
      input?.quantity ??
      typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
  };
}
