import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random shopping mall order creation data for E2E testing.
 *
 * Generates a complete IShoppingMallOrder.ICreate with randomized values
 * suitable for order placement tests. Produces 1-3 order items, each with
 * a UUID variant ID and a positive integer quantity.
 *
 * All shipping address fields are populated with realistic random values
 * using RandomGenerator utilities. When an input DeepPartial is provided,
 * any specified properties override the generated defaults, enabling
 * targeted test scenarios.
 *
 * The items array respects DeepPartial semantics: when input provides a
 * partial items array, each element's missing variant_id and quantity are
 * filled in individually.
 */
export function prepare_random_shopping_mall_order(
  input?: DeepPartial<IShoppingMallOrder.ICreate>,
): IShoppingMallOrder.ICreate {
  return {
    items: input?.items
      ? input.items.map((item) => ({
          variant_id:
            item.variant_id ?? typia.random<string & tags.Format<"uuid">>(),
          quantity:
            item.quantity ??
            typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
        }))
      : ArrayUtil.repeat(
          typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
          >(),
          () => ({
            variant_id: typia.random<string & tags.Format<"uuid">>(),
            quantity: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1>
            >(),
          }),
        ),
    recipient_name: input?.recipient_name ?? RandomGenerator.name(),
    phone_number: input?.phone_number ?? RandomGenerator.mobile(),
    street_address:
      input?.street_address ?? RandomGenerator.paragraph({ sentences: 1 }),
    city: input?.city ?? RandomGenerator.name(1),
    state_province: input?.state_province ?? RandomGenerator.name(1),
    postal_code: input?.postal_code ?? RandomGenerator.alphaNumeric(5),
    country: input?.country ?? RandomGenerator.name(1),
  };
}
