import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallShipmentOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentOrderItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_shopping_mall_shipment_order_item(
  input?: DeepPartial<IShoppingMallShipmentOrderItem.ICreate>,
): IShoppingMallShipmentOrderItem.ICreate {
  return {
    shopping_mall_shipment_id:
      input?.shopping_mall_shipment_id ??
      typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_order_item_id:
      input?.shopping_mall_order_item_id ??
      typia.random<string & tags.Format<"uuid">>(),
  };
}
