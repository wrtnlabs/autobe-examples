import { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random shopping cart creation data for E2E testing.
 *
 * Generates a complete IEcommerceMallCart.ICreate with randomized values for
 * adding a product variant to the authenticated customer's shopping cart.
 * Both quantity and variantId can be overridden via the optional input parameter
 * for specific test scenarios.
 *
 * The quantity must be a positive integer (minimum 1), representing the number
 * of units to add to the cart. If the same variant already exists in the cart,
 * quantities are combined rather than replaced.
 *
 * The variantId must reference an existing, non-deleted product variant in the
 * system.
 *
 * @param input Optional partial input to override specific fields
 * @returns Complete cart creation data
 */
export function prepare_random_ecommerce_mall_cart(
  input?: DeepPartial<IEcommerceMallCart.ICreate>,
): IEcommerceMallCart.ICreate {
  return {
    quantity:
      input?.quantity ??
      typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    variantId: input?.variantId ?? typia.random<string & tags.Format<"uuid">>(),
  };
}
