import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCartItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random shopping mall customer cart item creation data for E2E testing.
 *
 * Generates a complete IShoppingMallCustomerCartItem.ICreate with randomized values.
 * This DTO represents adding a product variant to the customer's shopping cart with
 * a specified quantity. The product variant must exist and be available for purchase.
 *
 * @param input - Optional partial input to override specific properties
 * @returns Complete IShoppingMallCustomerCartItem.ICreate instance
 */
export function prepare_random_shopping_mall_customer_cart_item(
  input?: DeepPartial<IShoppingMallCustomerCartItem.ICreate> | undefined,
): IShoppingMallCustomerCartItem.ICreate {
  return {
    productVariantId:
      input?.productVariantId ?? typia.random<string & tags.Format<"uuid">>(),
    quantity:
      input?.quantity ??
      typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
  };
}
