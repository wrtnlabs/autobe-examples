import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallShipmentConfirmation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentConfirmation";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_shopping_mall_shipment_confirmation(
  input?: DeepPartial<IShoppingMallShipmentConfirmation.ICreate>,
): IShoppingMallShipmentConfirmation.ICreate {
  return {
    shoppingMallShipmentId:
      input?.shoppingMallShipmentId ??
      typia.random<string & tags.Format<"uuid">>(),
    confirmedAt:
      input?.confirmedAt === undefined
        ? typia.random<string & tags.Format<"date-time">>()
        : (input.confirmedAt ?? null),
  };
}
