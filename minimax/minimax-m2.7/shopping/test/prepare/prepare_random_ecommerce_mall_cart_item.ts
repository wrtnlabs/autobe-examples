import { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random shopping cart item creation data for E2E testing.
 *
 * Generates a complete IEcommerceMallCartItem.ICreate with randomized values.
 * Both the quantity and product variant ID are customizable via the optional
 * input parameter. The quantity defaults to a random positive integer (minimum 1),
 * and the product variant ID defaults to a random UUID format string.
 *
 * @param input - Optional partial input to override specific fields
 * @returns Complete cart item creation data
 */
export function prepare_random_ecommerce_mall_cart_item(
  input?: DeepPartial<IEcommerceMallCartItem.ICreate>,
): IEcommerceMallCartItem.ICreate {
  return {
    quantity:
      input?.quantity ??
      typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    productVariantId:
      input?.productVariantId ?? typia.random<string & tags.Format<"uuid">>(),
  };
}
