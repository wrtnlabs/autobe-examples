import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random shopping mall cart item creation data for E2E testing.
 *
 * Generates a complete IShoppingMallCartItem.ICreate with randomized values for
 * adding a product variant to the authenticated customer's shopping cart. The
 * product_variant_id references a valid product variant UUID, and quantity is a
 * positive integer with minimum value of 1.
 *
 * Both properties support test customization through the optional input parameter,
 * allowing tests to override specific values while using random generation for
 * unspecified properties.
 */
export function prepare_random_shopping_mall_cart_item(
  input?: DeepPartial<IShoppingMallCartItem.ICreate>,
): IShoppingMallCartItem.ICreate {
  return {
    product_variant_id:
      input?.product_variant_id ?? typia.random<string & tags.Format<"uuid">>(),
    quantity:
      input?.quantity ??
      typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
  };
}
