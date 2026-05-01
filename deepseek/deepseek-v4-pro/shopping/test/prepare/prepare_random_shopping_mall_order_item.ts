import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random shopping mall order item creation data for E2E testing.
 *
 * Generates a complete IShoppingMallOrderItem.ICreate with randomized values
 * for both the variant reference and purchase quantity.
 *
 * The variant_id is generated as a random UUID via typia.random, while the
 * quantity is a positive integer (minimum 1) also generated via typia.random
 * with the int32 type constraint.
 *
 * Both properties accept override through the DeepPartial input parameter,
 * allowing tests to specify known variant IDs and specific quantities for
 * scenario testing such as stock validation or checkout flows.
 */
export function prepare_random_shopping_mall_order_item(
  input?: DeepPartial<IShoppingMallOrderItem.ICreate>,
): IShoppingMallOrderItem.ICreate {
  return {
    variant_id:
      input?.variant_id ?? typia.random<string & tags.Format<"uuid">>(),
    quantity:
      input?.quantity ??
      typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
  };
}
