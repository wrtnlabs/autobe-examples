import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomerWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerWishlist";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random shopping mall customer wishlist creation data for E2E testing.
 *
 * Generates a complete IShoppingMallCustomerWishlist.ICreate with randomized values.
 * This DTO represents adding a product to a customer's wishlist, containing only
 * the product identifier in UUID format.
 *
 * The productId is generated as a valid UUID and can be overridden via the input
 * parameter for specific test scenarios.
 */
export function prepare_random_shopping_mall_customer_wishlist(
  input?: DeepPartial<IShoppingMallCustomerWishlist.ICreate> | undefined,
): IShoppingMallCustomerWishlist.ICreate {
  return {
    productId: input?.productId ?? typia.random<string & tags.Format<"uuid">>(),
  };
}
