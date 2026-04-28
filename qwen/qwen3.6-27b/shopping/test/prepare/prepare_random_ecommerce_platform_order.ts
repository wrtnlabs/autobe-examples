import { IEcommercePlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrder";
import { IEcommercePlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrderItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random ecommerce platform order creation data for E2E testing.
 *
 * Generates a complete IEcommercePlatformOrder.ICreate with randomized values
 * including order items with product variants, quantities, and prices,
 * as well as a shipping address UUID for delivery.
 *
 * The items array generates 1-5 order line items where each item references
 * a specific product variant with quantity (minimum 1 unit) and per-unit price
 * (non-negative). Each order item captures the agreed-upon price at
 * checkout as an immutable historical financial record.
 *
 * Shipping address ID references a UUID-formatted identifier for the delivery
 * location associated with the authenticated customer's order.
 */
export function prepare_random_ecommerce_platform_order(
  input?: DeepPartial<IEcommercePlatformOrder.ICreate> | undefined,
): IEcommercePlatformOrder.ICreate {
  return {
    items: input?.items
      ? input.items.map((item) => ({
          ecommerce_platform_product_variant_id:
            item.ecommerce_platform_product_variant_id ??
            typia.random<string & tags.Format<"uuid">>(),
          quantity:
            item.quantity ??
            typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          price: item.price ?? typia.random<number & tags.Minimum<0>>(),
        }))
      : ArrayUtil.repeat(
          typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
          () => ({
            ecommerce_platform_product_variant_id: typia.random<
              string & tags.Format<"uuid">
            >(),
            quantity: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1>
            >(),
            price: typia.random<number & tags.Minimum<0>>(),
          }),
        ),
    shipping_address_id:
      input?.shipping_address_id ??
      typia.random<string & tags.Format<"uuid">>(),
  };
}
