import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrderShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_shopping_mall_order_shipment(
  input?: DeepPartial<IShoppingMallOrderShipment.ICreate>,
): IShoppingMallOrderShipment.ICreate {
  return {
    orderItemIds: input?.orderItemIds
      ? input.orderItemIds.map(
          (id) => id ?? typia.random<string & tags.Format<"uuid">>(),
        )
      : ArrayUtil.repeat(
          typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
          () => typia.random<string & tags.Format<"uuid">>(),
        ),
    carrierName:
      input?.carrierName ??
      RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 7 }),
    trackingNumber: input?.trackingNumber ?? RandomGenerator.alphaNumeric(16),
  };
}
