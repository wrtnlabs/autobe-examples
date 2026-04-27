import { IECommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCartItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random cart item creation data for E2E testing.
 *
 * Generates a complete IECommerceMallCartItem.ICreate with randomized values.
 * The function returns a valid cart item with a random product variant UUID and
 * a random positive integer quantity. Both properties can be overridden via the
 * optional `input` parameter, allowing test scenarios to specify exact variant
 * IDs or quantities.
 *
 * @param input - Optional partial overrides for cart item properties
 * @returns A complete IECommerceMallCartItem.ICreate suitable for adding to cart
 */
export function prepare_random_ecommerce_mall_cart_item(
  input?: DeepPartial<IECommerceMallCartItem.ICreate> | undefined,
): IECommerceMallCartItem.ICreate {
  return {
    product_variant_id:
      input?.product_variant_id ?? typia.random<string & tags.Format<"uuid">>(),
    quantity:
      input?.quantity ??
      typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
  };
}
