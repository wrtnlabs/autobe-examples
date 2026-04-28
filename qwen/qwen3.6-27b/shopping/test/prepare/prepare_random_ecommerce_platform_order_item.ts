import { IEcommercePlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrderItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random ecommerce platform order item creation data for E2E testing.
 *
 * Generates a complete IEcommercePlatformOrderItem.ICreate with randomized product variant reference (UUID),
 * order quantity (positive integer), and per-unit price (non-negative value).
 */
export function prepare_random_ecommerce_platform_order_item(
  input?: DeepPartial<IEcommercePlatformOrderItem.ICreate> | undefined,
): IEcommercePlatformOrderItem.ICreate {
  return {
    ecommerce_platform_product_variant_id:
      input?.ecommerce_platform_product_variant_id ??
      typia.random<string & tags.Format<"uuid">>(),
    quantity:
      input?.quantity ??
      typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    price: input?.price ?? typia.random<number & tags.Minimum<0>>(),
  };
}
