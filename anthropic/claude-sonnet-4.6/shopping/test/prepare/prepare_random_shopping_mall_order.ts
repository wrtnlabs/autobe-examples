import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_shopping_mall_order(
  input?: DeepPartial<IShoppingMallOrder.ICreate> | undefined,
): IShoppingMallOrder.ICreate {
  return {
    recipient_name: input?.recipient_name ?? RandomGenerator.name(),
    recipient_phone: input?.recipient_phone ?? RandomGenerator.mobile(),
    shipping_address_line1:
      input?.shipping_address_line1 ??
      RandomGenerator.paragraph({ sentences: 1 }),
    shipping_address_line2:
      input?.shipping_address_line2 !== undefined
        ? input.shipping_address_line2
        : null,
    shipping_city: input?.shipping_city ?? RandomGenerator.name(1),
    shipping_state:
      input?.shipping_state !== undefined ? input.shipping_state : null,
    shipping_postal_code:
      input?.shipping_postal_code ?? RandomGenerator.alphaNumeric(5),
    shipping_country:
      input?.shipping_country ??
      RandomGenerator.pick([
        "US",
        "KR",
        "JP",
        "GB",
        "DE",
        "FR",
        "CA",
        "AU",
      ] as const),
    items: input?.items
      ? input.items.map((item) => ({
          product_variant_id:
            item.product_variant_id ??
            typia.random<string & tags.Format<"uuid">>(),
          quantity:
            item.quantity ??
            typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
            >(),
        }))
      : ArrayUtil.repeat(
          typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
          >(),
          () => ({
            product_variant_id: typia.random<string & tags.Format<"uuid">>(),
            quantity: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
            >(),
          }),
        ),
  };
}
