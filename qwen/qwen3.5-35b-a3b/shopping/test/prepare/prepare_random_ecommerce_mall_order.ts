import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random ecommerce mall order creation data for E2E testing.
 *
 * Generates a complete IEcommerceMallOrder.ICreate with randomized shipping
 * address and order items for checkout flow testing. The shipping address UUID
 * is randomly generated or can be overridden via input to test different
 * customer addresses. Order items include product variant references and
 * quantities for realistic order scenarios.
 */
export function prepare_random_ecommerce_mall_order(
  input?: DeepPartial<IEcommerceMallOrder.ICreate>,
): IEcommerceMallOrder.ICreate {
  return {
    shipping_address_id:
      input?.shipping_address_id ??
      typia.random<string & tags.Format<"uuid">>(),
    order_items: input?.order_items
      ? input.order_items.map((item) => ({
          product_variant_id:
            item.product_variant_id ??
            typia.random<string & tags.Format<"uuid">>(),
          quantity:
            item.quantity ??
            typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
        }))
      : ArrayUtil.repeat(
          typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
          () => ({
            product_variant_id: typia.random<string & tags.Format<"uuid">>(),
            quantity: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
            >(),
          }),
        ),
  };
}
