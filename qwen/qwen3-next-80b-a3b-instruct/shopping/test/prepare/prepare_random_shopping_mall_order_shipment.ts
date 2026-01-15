import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrderShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderShipment";
export function prepare_random_shopping_mall_order_shipment(
  input?: DeepPartial<IShoppingMallOrderShipment.ICreate>,
): IShoppingMallOrderShipment.ICreate {
  return {
    orderCode:
      input?.orderCode ??
      `ORD-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<9999>>()}`,
    carrierId: typia.random<string & tags.Format<"uuid">>(),
    shippingMethodId: typia.random<string & tags.Format<"uuid">>(),
    shippingAddressId: typia.random<string & tags.Format<"uuid">>(),
    trackingNumber: input?.trackingNumber ?? RandomGenerator.alphaNumeric(15),
  };
}
