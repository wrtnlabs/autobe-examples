import { IEcommerceCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCartItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random e-commerce cart item creation data for E2E testing.
 *
 * Generates a complete IEcommerceCartItem.ICreate with randomized values for adding a product variant to a customer's shopping cart. The function respects any input overrides while providing realistic default data for all required fields.
 *
 * ## Generated Fields
 *
 * - `ecommerce_product_variant_id` - Random UUID referencing a product variant
 * - `quantity` - Random positive integer (minimum 1) representing units to add
 *
 * ## Usage
 *
 * ```typescript
 * // Generate with random defaults
 * const cartItem = prepare_random_ecommerce_cart_item();
 *
 * // Override specific fields
 * const customCartItem = prepare_random_ecommerce_cart_item({
 *   quantity: 5,
 * });
 * ```
 */
export function prepare_random_ecommerce_cart_item(
  input?: DeepPartial<IEcommerceCartItem.ICreate>,
): IEcommerceCartItem.ICreate {
  return {
    ecommerce_product_variant_id:
      input?.ecommerce_product_variant_id ??
      typia.random<string & tags.Format<"uuid">>(),
    quantity:
      input?.quantity ??
      typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
  };
}
