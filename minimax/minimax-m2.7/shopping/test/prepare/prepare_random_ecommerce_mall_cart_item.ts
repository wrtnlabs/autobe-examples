import { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepares random test data for adding a product variant to a shopping cart.
 *
 * @param input - Optional DeepPartial input to override specific properties
 * @returns Complete ICreate object with random values for unspecified properties
 */
export function prepare_random_ecommerce_mall_cart_item(
  input?: DeepPartial<IEcommerceMallCartItem.ICreate>,
): IEcommerceMallCartItem.ICreate {
  return {
    quantity:
      input?.quantity ??
      typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    variant_id:
      input?.variant_id ?? typia.random<string & tags.Format<"uuid">>(),
  };
}
