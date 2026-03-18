import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_shopping_mall_order_item(
  input?: DeepPartial<IShoppingMallOrderItem.ICreate>,
): IShoppingMallOrderItem.ICreate {
  return {
    shopping_mall_order_id:
      input?.shopping_mall_order_id ??
      typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_product_variant_id:
      input?.shopping_mall_product_variant_id ??
      typia.random<string & tags.Format<"uuid">>(),
    seller_snapshot_id:
      input?.seller_snapshot_id ?? typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_shipment_id:
      input?.shopping_mall_shipment_id === undefined
        ? undefined
        : ((input.shopping_mall_shipment_id ?? null) as
            | (string & tags.Format<"uuid">)
            | null),
    seller_price_at_purchase:
      input?.seller_price_at_purchase ?? typia.random<number>(),
    quantity:
      input?.quantity ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100000>
      >(),
    line_item_status:
      input?.line_item_status ??
      RandomGenerator.pick(["placed", "confirmed", "pending"] as const),
    placed_at:
      input?.placed_at ??
      RandomGenerator.date(
        new Date("2026-03-01T00:00:00.000Z"),
        1000 * 60 * 60 * 24 * 30,
      ).toISOString(),
  };
}
