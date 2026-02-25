import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_shopping_mall_shipment_item(
  input?: DeepPartial<IShoppingMallShipmentItem.ICreate>,
): IShoppingMallShipmentItem.ICreate {
  return {
    shipmentId:
      input?.shipmentId ?? typia.random<string & tags.Format<"uuid">>(),
    orderItemId:
      input?.orderItemId ?? typia.random<string & tags.Format<"uuid">>(),
  };
}
