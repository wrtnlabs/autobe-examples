import { IEcommercePlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_ecommerce_platform_shipment(
  input?: DeepPartial<IEcommercePlatformShipment.ICreate>,
): IEcommercePlatformShipment.ICreate {
  return {
    carrierName: input?.carrierName ?? RandomGenerator.alphabets(10),
    trackingNumber: input?.trackingNumber ?? RandomGenerator.alphaNumeric(12),
    orderItemIds:
      input?.orderItemIds ??
      Array.from({ length: 1 }, () =>
        typia.random<string & tags.Format<"uuid">>(),
      ),
  };
}
