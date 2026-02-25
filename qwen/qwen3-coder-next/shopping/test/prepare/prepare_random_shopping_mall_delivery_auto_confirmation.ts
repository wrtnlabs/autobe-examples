import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallDeliveryAutoConfirmation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDeliveryAutoConfirmation";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_shopping_mall_delivery_auto_confirmation(
  input?:
    | DeepPartial<IShoppingMallDeliveryAutoConfirmation.ICreate>
    | undefined,
): IShoppingMallDeliveryAutoConfirmation.ICreate {
  return {
    shopping_mall_shipment_id:
      input?.shopping_mall_shipment_id ??
      typia.random<string & tags.Format<"uuid">>(),
    confirmed_at:
      input?.confirmed_at ?? typia.random<string & tags.Format<"date-time">>(),
    auto_confirmed_by:
      input?.auto_confirmed_by ??
      (RandomGenerator.pick(["system_job"] as const) as string),
  };
}
