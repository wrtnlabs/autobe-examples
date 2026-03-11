import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_ecommerce_mall_shipment(
  input?: DeepPartial<IEcommerceMallShipment.ICreate>,
): IEcommerceMallShipment.ICreate {
  return {
    carrier_name:
      input?.carrier_name ??
      RandomGenerator.pick(["USPS", "FedEx", "DHL", "UPS"] as const),
    tracking_number:
      input?.tracking_number ?? typia.random<string & tags.Format<"uuid">>(),
    order_items: input?.order_items
      ? input.order_items.map((item) => ({
          quantity:
            item.quantity ??
            typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          unit_price:
            item.unit_price ?? typia.random<number & tags.Minimum<0>>(),
          product_id:
            item.product_id ?? typia.random<string & tags.Format<"uuid">>(),
          variant_id:
            item.variant_id ?? typia.random<string & tags.Format<"uuid">>(),
          product_snapshot:
            item.product_snapshot ??
            JSON.stringify({
              name: RandomGenerator.name(2),
              description: RandomGenerator.paragraph({ sentences: 2 }),
              base_price: typia.random<number & tags.Minimum<0>>(),
            }),
          variant_snapshot:
            item.variant_snapshot ??
            JSON.stringify({
              sku_code: RandomGenerator.alphabets(8),
              price_override: typia.random<number & tags.Minimum<0>>(),
            }),
          seller_profile_snapshot:
            item.seller_profile_snapshot ??
            JSON.stringify({
              shop_name: RandomGenerator.name(2),
              shop_description: RandomGenerator.paragraph({ sentences: 1 }),
            }),
        }))
      : ArrayUtil.repeat(
          typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
          () => ({
            quantity: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1>
            >(),
            unit_price: typia.random<number & tags.Minimum<0>>(),
            product_id: typia.random<string & tags.Format<"uuid">>(),
            variant_id: typia.random<string & tags.Format<"uuid">>(),
            product_snapshot: JSON.stringify({
              name: RandomGenerator.name(2),
              description: RandomGenerator.paragraph({ sentences: 2 }),
              base_price: typia.random<number & tags.Minimum<0>>(),
            }),
            variant_snapshot: JSON.stringify({
              sku_code: RandomGenerator.alphabets(8),
              price_override: typia.random<number & tags.Minimum<0>>(),
            }),
            seller_profile_snapshot: JSON.stringify({
              shop_name: RandomGenerator.name(2),
              shop_description: RandomGenerator.paragraph({ sentences: 1 }),
            }),
          }),
        ),
  };
}
