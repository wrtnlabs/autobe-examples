import { IEcommercePlatformShoppingCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShoppingCartItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random shopping cart item data for E2E testing.
 *
 * Generates a complete IEcommercePlatformShoppingCartItem.ICreate with randomized values.
 *
 * This function creates test data for adding a product variant to the shopping cart,
 * including the product variant UUID and quantity constraints are properly enforced.
 * The `product_variant_id` is generated as a valid UUID format, and `quantity`
 * respects the minimum constraint of 1.
 *
 * When `input` is provided, it overrides the randomly generated values using the
 * DeepPartial semantics where all nested properties are optional.
 */
export function prepare_random_ecommerce_platform_shopping_cart_item(
  input?: DeepPartial<IEcommercePlatformShoppingCartItem.ICreate>,
): IEcommercePlatformShoppingCartItem.ICreate {
  return {
    product_variant_id:
      input?.product_variant_id ?? typia.random<string & tags.Format<"uuid">>(),
    quantity:
      input?.quantity ??
      typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
  };
}
