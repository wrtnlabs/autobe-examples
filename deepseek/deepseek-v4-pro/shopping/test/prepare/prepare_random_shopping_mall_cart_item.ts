import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random shopping mall cart item creation data for E2E testing.
 *
 * Generates a complete IShoppingMallCartItem.ICreate with randomized values
 * for both the product variant ID reference and the quantity to add to the
 * authenticated customer's shopping cart.
 *
 * The product variant ID is generated as a random UUID, and the quantity is
 * a random positive integer (minimum 1). Both values can be overridden via
 * the optional DeepPartial input parameter for test-specific scenarios.
 */
export function prepare_random_shopping_mall_cart_item(
  input?: DeepPartial<IShoppingMallCartItem.ICreate> | undefined,
): IShoppingMallCartItem.ICreate {
  return {
    productVariantId:
      input?.productVariantId ?? typia.random<string & tags.Format<"uuid">>(),
    quantity:
      input?.quantity ??
      typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
  };
}
