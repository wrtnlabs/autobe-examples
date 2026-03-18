import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { IShoppingMallShipmentConfirmation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentConfirmation";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_shopping_mall_shipment(
  input?: DeepPartial<IShoppingMallShipment.ICreate> | undefined,
): IShoppingMallShipment.ICreate {
  return {
    shopping_mall_order_id:
      input?.shopping_mall_order_id ??
      typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_order_item_ids: input?.shopping_mall_order_item_ids
      ? input.shopping_mall_order_item_ids.map(
          (id) => id ?? typia.random<string & tags.Format<"uuid">>(),
        )
      : ArrayUtil.repeat(
          typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
          >(),
          () => typia.random<string & tags.Format<"uuid">>(),
        ),
    shipment_confirmation:
      input?.shipment_confirmation === null
        ? null
        : input?.shipment_confirmation
          ? {
              shoppingMallShipmentId:
                input.shipment_confirmation.shoppingMallShipmentId ??
                typia.random<string & tags.Format<"uuid">>(),
              confirmationType:
                input.shipment_confirmation.confirmationType ??
                RandomGenerator.name(2),
              confirmedAt:
                input.shipment_confirmation.confirmedAt ??
                typia.random<string & tags.Format<"date-time">>(),
              trackingUrl: input.shipment_confirmation.trackingUrl ?? null,
              trackingNumber:
                input.shipment_confirmation.trackingNumber ?? null,
              carrierName: input.shipment_confirmation.carrierName ?? null,
              note: input.shipment_confirmation.note ?? null,
            }
          : {
              shoppingMallShipmentId: typia.random<
                string & tags.Format<"uuid">
              >(),
              confirmationType: RandomGenerator.name(2),
              confirmedAt: typia.random<string & tags.Format<"date-time">>(),
              trackingUrl: typia.random<string & tags.Format<"url">>(),
              trackingNumber: RandomGenerator.alphabets(10),
              carrierName: RandomGenerator.name(1),
              note: RandomGenerator.paragraph({ sentences: 2 }),
            },
  };
}
